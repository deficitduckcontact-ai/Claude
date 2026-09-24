import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { beforeUserCreated } from 'firebase-functions/v2/identity';
import { APP_CHECK, auth, db, requireUser, stripe, STRIPE_SECRET_KEY } from './shared.js';
import { isDisposableEmail } from './spam.js';

/**
 * Runs before any account is created (email or Google). Requires an email and
 * blocks throwaway inboxes. NOTE: blocking functions need Firebase Auth to be
 * upgraded to Identity Platform (free tier covers 50k monthly users).
 */
export const screenSignup = beforeUserCreated((event) => {
  const email = event.data?.email;
  if (!email) throw new HttpsError('invalid-argument', 'An email address is required');
  if (isDisposableEmail(email)) throw new HttpsError('permission-denied', 'Please use a permanent email address');
});

/**
 * Right to erasure (GDPR / PIPEDA / CCPA). Cancels billing, deletes the
 * profile and personal subcollections, anonymises comments, deletes the login.
 * Ledger rows are kept: financial records must be retained for tax purposes.
 */
export const deleteAccount = onCall({ enforceAppCheck: APP_CHECK, secrets: [STRIPE_SECRET_KEY], timeoutSeconds: 300 }, async (req) => {
  const uid = requireUser(req);
  if (req.data?.confirm !== 'DELETE') throw new HttpsError('invalid-argument', 'Type DELETE to confirm');
  const creator = await db.doc(`creators/${uid}`).get();
  if (creator.exists && (await db.collection('series').where('creatorIds', 'array-contains', uid).limit(1).get()).size)
    throw new HttpsError('failed-precondition', 'Creators with series: contact support so we can settle payouts first');

  const sub = await db.doc(`subscriptions/${uid}`).get();
  if (sub.get('stripeSubscriptionId') && sub.get('status') !== 'canceled')
    await stripe().subscriptions.cancel(sub.get('stripeSubscriptionId')).catch(() => {});

  const comments = await db.collectionGroup('comments').where('uid', '==', uid).get();
  const w = db.bulkWriter();
  comments.forEach((c) => w.update(c.ref, { handle: '[deleted]', body: '[deleted]', uid: 'deleted' }));
  await w.close();

  const handle = (await db.doc(`users/${uid}`).get()).get('handle');
  await db.recursiveDelete(db.doc(`users/${uid}`));
  await Promise.all([
    db.doc(`subscriptions/${uid}`).delete(),
    db.doc(`rateLimits/${uid}`).delete(),
    handle ? db.doc(`handles/${handle}`).delete() : null
  ]);
  await auth.deleteUser(uid);
  return { ok: true };
});
