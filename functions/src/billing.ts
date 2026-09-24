// Reader subscriptions. Stripe is the source of truth; Firestore mirrors it
// via the webhook. Clients can never write subscriptions/* (see rules).
import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions/v2';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import type Stripe from 'stripe';
import { db, requireUser, safeOrigin, stripe, validPicks, STRIPE_PRICE_MONTHLY, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET } from './shared.js';
import { split, CURRENCY, type Pick } from './split.js';

const secrets = [STRIPE_SECRET_KEY];

async function customerFor(uid: string, email?: string): Promise<string> {
  const ref = db.doc(`users/${uid}/private/stripe`);
  const snap = await ref.get();
  if (snap.get('customerId')) return snap.get('customerId');
  const c = await stripe().customers.create({ email, metadata: { uid } }, { idempotencyKey: `customer:${uid}` });
  await ref.set({ customerId: c.id }, { merge: true });
  return c.id;
}

export const createCheckout = onCall({ secrets }, async (req) => {
  const uid = requireUser(req);
  const picks = await validPicks(req.data?.picks);
  const existing = await db.doc(`subscriptions/${uid}`).get();
  if (['active', 'past_due', 'trialing'].includes(existing.get('status'))) throw new HttpsError('failed-precondition', 'Already subscribed — change artists instead');
  // TODO(billing): annual price (req.data.interval === 'year').
  const customer = await customerFor(uid, req.auth!.token.email);
  // Guard against double subscriptions (double-click, two tabs, webhook lag):
  // Firestore may not know yet, so ask Stripe directly.
  const live = await stripe().subscriptions.list({ customer, status: 'all', limit: 10 });
  if (live.data.some((s) => ['active', 'past_due', 'trialing', 'incomplete'].includes(s.status)))
    throw new HttpsError('failed-precondition', 'You already have a subscription — refresh the page');
  const origin = safeOrigin(req.data?.origin);
  // Picks can exceed Stripe's 500-char metadata limit, so they wait in Firestore.
  await db.doc(`users/${uid}/private/checkout`).set({ picks, at: FieldValue.serverTimestamp() });
  const session = await stripe().checkout.sessions.create({
    // Short-lived, so a forgotten Checkout tab can't complete a second subscription hours later.
    expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    mode: 'subscription',
    customer,
    line_items: [{ price: STRIPE_PRICE_MONTHLY.value(), quantity: picks.length }],
    subscription_data: { metadata: { uid } },
    metadata: { uid },
    allow_promotion_codes: true,
    success_url: `${origin}/subscribe/success`,
    cancel_url: `${origin}/subscribe`
  });
  return { url: session.url };
});

export const updatePicks = onCall({ secrets }, async (req) => {
  const uid = requireUser(req);
  const picks = await validPicks(req.data?.picks);
  const ref = db.doc(`subscriptions/${uid}`);
  const sub = await ref.get();
  if (!sub.exists || !['active', 'past_due', 'trialing'].includes(sub.get('status'))) throw new HttpsError('failed-precondition', 'No active subscription');
  const s = await stripe().subscriptions.retrieve(sub.get('stripeSubscriptionId'));
  const item = s.items.data[0];
  if (item.quantity !== picks.length) {
    await stripe().subscriptions.update(s.id, { items: [{ id: item.id, quantity: picks.length }], proration_behavior: 'create_prorations' });
  }
  await ref.update({ picks, picksChangedAt: FieldValue.serverTimestamp() });
  return { ok: true };
});

export const billingPortal = onCall({ secrets }, async (req) => {
  const uid = requireUser(req);
  const customer = await customerFor(uid, req.auth!.token.email);
  const s = await stripe().billingPortal.sessions.create({ customer, return_url: `${safeOrigin(req.data?.origin)}/me/billing` });
  return { url: s.url };
});

// ---------------------------------------------------------------- webhook
// Hosting rewrites /api/stripe-webhook here. Point the Stripe dashboard at
// https://<domain>/api/stripe-webhook with the events handled below.
export const stripeWebhook = onRequest({ secrets: [STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET] }, async (req, res) => {
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(req.rawBody, req.headers['stripe-signature'] as string, STRIPE_WEBHOOK_SECRET.value());
  } catch (e) {
    logger.warn('bad stripe signature', e);
    res.status(400).send('bad signature');
    return;
  }
  // Idempotency: Stripe retries; each event is processed once.
  const mark = db.doc(`stripeEvents/${event.id}`);
  try { await mark.create({ type: event.type, at: FieldValue.serverTimestamp(), done: false }); }
  catch { res.status(200).send('duplicate'); return; }

  try {
    await handle(event);
    await mark.update({ done: true });
    res.status(200).send('ok');
  } catch (e) {
    logger.error('webhook failed', event.type, e);
    await mark.delete(); // let Stripe's retry try again
    res.status(500).send('error');
  }
});

async function handle(event: Stripe.Event) {
  switch (event.type) {
    case 'checkout.session.completed': {
      const s = event.data.object as Stripe.Checkout.Session;
      const uid = s.metadata?.uid;
      if (!uid || !s.subscription) return;
      const pending = await db.doc(`users/${uid}/private/checkout`).get();
      const sub = await stripe().subscriptions.retrieve(s.subscription as string);
      await db.doc(`subscriptions/${uid}`).set({
        stripeSubscriptionId: sub.id,
        status: sub.status,
        picks: pending.get('picks') ?? [],
        since: FieldValue.serverTimestamp(),
        currentPeriodEnd: Timestamp.fromMillis(sub.current_period_end * 1000)
      }, { merge: true });
      return;
    }
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      const uid = sub.metadata?.uid;
      if (!uid) return;
      // Stripe doesn't guarantee delivery order — never let an older event overwrite newer state.
      const ref = db.doc(`subscriptions/${uid}`);
      const cur = await ref.get();
      if ((cur.get('lastEventAt') ?? 0) > event.created) return;
      if (cur.get('stripeSubscriptionId') && cur.get('stripeSubscriptionId') !== sub.id && event.type === 'customer.subscription.deleted') return;
      await ref.set({
        lastEventAt: event.created,
        stripeSubscriptionId: sub.id,
        status: event.type === 'customer.subscription.deleted' ? 'canceled' : sub.status,
        currentPeriodEnd: Timestamp.fromMillis(sub.current_period_end * 1000)
      }, { merge: true });
      return;
    }
    case 'invoice.paid':
      return payCreators(event.data.object as Stripe.Invoice);
    case 'charge.refunded':
      return clawBack(event.data.object as Stripe.Charge);
    case 'charge.dispute.created':
      // TODO(disputes): reverse creator transfers on lost disputes (charge.dispute.closed, status=lost)
      // and alert an admin. Disputes cost $15 each on top of the amount.
      logger.warn('dispute opened', (event.data.object as Stripe.Dispute).id);
      return;
    case 'account.updated': {
      const acct = event.data.object as Stripe.Account;
      const uid = acct.metadata?.uid;
      if (uid) await db.doc(`creators/${uid}`).set({ payoutsEnabled: acct.payouts_enabled, detailsSubmitted: acct.details_submitted }, { merge: true });
      return;
    }
    default:
      return;
  }
}

/**
 * Split a paid invoice across the reader's picks and transfer each creator's
 * share to their Connect account. Transfers use source_transaction so they
 * draw on this exact charge (no balance juggling) and idempotency keys so a
 * retried webhook can't double-pay.
 */
async function payCreators(inv: Stripe.Invoice) {
  if (!inv.subscription || !inv.amount_paid) return;
  const sub = await stripe().subscriptions.retrieve(inv.subscription as string);
  const uid = sub.metadata?.uid;
  if (!uid) return;
  const picks: string[] = (await db.doc(`subscriptions/${uid}`).get()).get('picks') ?? [];
  if (!picks.length) return;

  const seriesDocs = await db.getAll(...picks.map((s) => db.doc(`series/${s}`)));
  const splitPicks: Pick[] = seriesDocs.map((d) => ({ slug: d.id, creatorUids: d.get('creatorIds') ?? [] }));

  // Actual Stripe fee from the balance transaction. (Stripe API "acacia": invoice.charge.
  // TODO(stripe-upgrade): on API ≥ 2025-03-31 use invoice payments to find the charge.)
  const chargeId = (inv as unknown as { charge?: string }).charge;
  let fee: number | undefined;
  if (chargeId) {
    const ch = await stripe().charges.retrieve(chargeId, { expand: ['balance_transaction'] });
    fee = (ch.balance_transaction as Stripe.BalanceTransaction | null)?.fee;
  }
  const s = split(inv.amount_paid, splitPicks, fee);

  const creators = await db.getAll(...Object.keys(s.perCreator).filter((c) => c !== '__unclaimed__').map((c) => db.doc(`creators/${c}`)));
  const batch = db.batch();
  for (const c of creators) {
    const amount = s.perCreator[c.id];
    if (!amount) continue;
    const dest = c.get('connectAccountId');
    let transferId: string | null = null;
    let state = 'owed';
    if (dest && c.get('payoutsEnabled') && chargeId) {
      const t = await stripe().transfers.create(
        { amount, currency: inv.currency ?? CURRENCY, destination: dest, source_transaction: chargeId, transfer_group: inv.id, metadata: { invoice: inv.id!, reader: uid } },
        { idempotencyKey: `transfer:${inv.id}:${c.id}` }
      );
      transferId = t.id; state = 'paid';
    }
    // 'owed' rows are settled by a TODO(payouts) job once the creator finishes Connect onboarding.
    batch.set(db.doc(`ledger/${inv.id}_${c.id}`), {
      invoiceId: inv.id, readerUid: uid, creatorUid: c.id, amount, currency: inv.currency, state, transferId, at: FieldValue.serverTimestamp()
    });
  }
  batch.set(db.doc(`ledger/${inv.id}_platform`), {
    invoiceId: inv.id, readerUid: uid, creatorUid: null, gross: s.grossCents, fee: s.feeCents, platformNet: s.platformNetCents,
    unclaimed: s.perCreator.__unclaimed__ ?? 0, at: FieldValue.serverTimestamp()
  });
  await batch.commit();
}

/**
 * Refunds: pull back the same fraction of each creator transfer, so a refund
 * doesn't come entirely out of TinyCoup's 15%. Idempotent per refund amount.
 */
async function clawBack(ch: Stripe.Charge) {
  const invoiceId = (ch as unknown as { invoice?: string }).invoice;
  if (!invoiceId || !ch.amount_refunded) return;
  const fraction = ch.amount_refunded / ch.amount;
  const rows = await db.collection('ledger').where('invoiceId', '==', invoiceId).where('state', '==', 'paid').get();
  for (const row of rows.docs) {
    const target = Math.round(row.get('amount') * fraction);
    const already = row.get('reversed') ?? 0;
    if (target <= already || !row.get('transferId')) continue;
    await stripe().transfers.createReversal(row.get('transferId'), { amount: target - already },
      { idempotencyKey: `reverse:${row.id}:${target}` });
    await row.ref.update({ reversed: target });
  }
  // 'owed' rows for creators not yet onboarded: just reduce what's owed.
  const owed = await db.collection('ledger').where('invoiceId', '==', invoiceId).where('state', '==', 'owed').get();
  for (const row of owed.docs) await row.ref.update({ reversed: Math.round(row.get('amount') * fraction) });
}
