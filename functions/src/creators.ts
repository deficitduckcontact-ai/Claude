import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { FieldValue } from 'firebase-admin/firestore';
import { auth, db, requireCreator, requireUser, safeOrigin, stripe, STRIPE_SECRET_KEY } from './shared.js';

/** Become a creator: Stripe Connect Express account + `creator` custom claim, then onboarding link. */
export const creatorOnboard = onCall({ secrets: [STRIPE_SECRET_KEY] }, async (req) => {
  const uid = requireUser(req);
  const ref = db.doc(`creators/${uid}`);
  let accountId: string | undefined = (await ref.get()).get('connectAccountId');
  if (!accountId) {
    const acct = await stripe().accounts.create(
      { type: 'express', email: req.auth!.token.email, metadata: { uid }, capabilities: { transfers: { requested: true } } },
      { idempotencyKey: `connect:${uid}` }
    );
    accountId = acct.id;
    const profile = (await db.doc(`users/${uid}`).get()).data() ?? {};
    await ref.set({ connectAccountId: accountId, payoutsEnabled: false, displayName: profile.displayName ?? '', handle: profile.handle ?? '', createdAt: FieldValue.serverTimestamp() }, { merge: true });
    await auth.setCustomUserClaims(uid, { ...(req.auth!.token as object), creator: true });
    // TODO(connect): creators outside the platform's country need cross-border payouts
    // (recipient service agreement) — check Stripe's supported-countries list per creator.
  }
  const origin = safeOrigin(req.data?.origin);
  const link = await stripe().accountLinks.create({
    account: accountId, type: 'account_onboarding',
    refresh_url: `${origin}/studio`, return_url: `${origin}/studio?onboarded=1`
  });
  return { url: link.url };
});

export const createSeries = onCall(async (req) => {
  const uid = requireCreator(req);
  const { title, tagline = '', about = '', tags = [] } = req.data ?? {};
  if (typeof title !== 'string' || title.trim().length < 2 || title.length > 60) throw new HttpsError('invalid-argument', 'Title must be 2–60 characters');
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
  const ref = db.doc(`series/${slug}`);
  await db.runTransaction(async (tx) => {
    if ((await tx.get(ref)).exists) throw new HttpsError('already-exists', 'That series name is taken');
    tx.set(ref, {
      title: title.trim(), tagline: String(tagline).slice(0, 90), about: String(about).slice(0, 1200),
      tags: (Array.isArray(tags) ? tags : []).slice(0, 5).map(String), creatorIds: [uid],
      followers: 0, episodeCount: 0, createdAt: FieldValue.serverTimestamp()
    });
  });
  return { slug };
});
