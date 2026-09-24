// Comments, reports and moderation. All comment writes go through here so we
// can enforce who may comment, rate limits and the spam filter server-side.
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { FieldValue } from 'firebase-admin/firestore';
import { APP_CHECK, COMMENT_POLICY, db, episodeArg, requireUser, slugArg } from './shared.js';
import { checkComment, rateLimit, type RateState } from './spam.js';

export const postComment = onCall({ enforceAppCheck: APP_CHECK }, async (req) => {
  const uid = requireUser(req);
  const token = req.auth!.token;
  if (!token.email || token.email_verified !== true) throw new HttpsError('failed-precondition', 'Verify your email to comment');
  const slug = slugArg(req.data?.slug);
  const id = episodeArg(req.data?.id);
  const body = String(req.data?.body ?? '');
  const parentId = req.data?.parentId == null ? null : String(req.data.parentId);
  if (parentId && !/^[A-Za-z0-9]{8,40}$/.test(parentId)) throw new HttpsError('invalid-argument', 'Bad reply target');

  if (COMMENT_POLICY === 'supporters' && token.creator !== true) {
    const sub = await db.doc(`subscriptions/${uid}`).get();
    if (!['active', 'past_due', 'trialing'].includes(sub.get('status')))
      throw new HttpsError('permission-denied', 'Comments are for supporters — back an artist to join in');
  }

  const [profile, ep, recent] = await Promise.all([
    db.doc(`users/${uid}`).get(),
    db.doc(`series/${slug}/episodes/${id}`).get(),
    db.collectionGroup('comments').where('uid', '==', uid).orderBy('createdAt', 'desc').limit(5).get()
  ]);
  if (!ep.exists || ep.get('status') !== 'published') throw new HttpsError('not-found', 'No such episode');
  if (profile.get('banned')) throw new HttpsError('permission-denied', 'This account can’t comment');

  const created = profile.get('createdAt')?.toMillis?.() ?? Date.now();
  const verdict = checkComment({ body, accountAgeMs: Date.now() - created, recentBodies: recent.docs.map((d) => d.get('body')) });
  if (verdict.action === 'reject') throw new HttpsError('invalid-argument', verdict.reasons[0] === 'duplicate' ? 'You already posted that' : 'That comment can’t be posted');

  // Rate limit in a transaction so parallel requests can't sneak past it.
  const rlRef = db.doc(`rateLimits/${uid}`);
  const ref = db.collection(`series/${slug}/episodes/${id}/comments`).doc();
  await db.runTransaction(async (tx) => {
    const r = rateLimit((await tx.get(rlRef)).get('comments') as RateState | undefined, Date.now());
    if (!r.ok) throw new HttpsError('resource-exhausted', 'Slow down a little — try again in a minute');
    tx.set(rlRef, { comments: r.next }, { merge: true });
    tx.set(ref, {
      uid, handle: profile.get('handle'), body: body.trim(), parentId, createdAt: FieldValue.serverTimestamp(),
      status: verdict.action === 'hold' ? 'held' : 'visible', flags: verdict.reasons, reports: 0
    });
  });
  return { id: ref.id, status: verdict.action === 'hold' ? 'held' : 'visible' };
});

const REPORT_REASONS = new Set(['spam', 'harassment', 'hate', 'sexual', 'violence', 'copyright', 'other']);
const COMMENT_PATH = /^series\/[a-z0-9-]{1,40}\/episodes\/ep-\d{1,6}\/comments\/[A-Za-z0-9]{8,40}$/;

export const report = onCall({ enforceAppCheck: APP_CHECK }, async (req) => {
  const uid = requireUser(req);
  const path = String(req.data?.path ?? '');
  const reason = String(req.data?.reason ?? '');
  if (!COMMENT_PATH.test(path) || !REPORT_REASONS.has(reason)) throw new HttpsError('invalid-argument', 'Bad report');
  // One report per user per target (doc id = hash-free composite).
  const rid = `${path.replace(/\//g, '_')}__${uid}`;
  await db.doc(`reports/${rid}`).create({ path, reason, uid, note: String(req.data?.note ?? '').slice(0, 500), createdAt: FieldValue.serverTimestamp(), state: 'open' })
    .catch(() => { throw new HttpsError('already-exists', 'You already reported this'); });
  return { ok: true };
});

/** Three independent reports auto-hide a comment until a moderator looks. */
export const onReport = onDocumentCreated('reports/{rid}', async (e) => {
  const path = e.data?.get('path');
  if (!path) return;
  const ref = db.doc(path);
  await db.runTransaction(async (tx) => {
    const c = await tx.get(ref);
    if (!c.exists) return;
    const n = (c.get('reports') ?? 0) + 1;
    tx.update(ref, { reports: n, ...(n >= 3 && c.get('status') === 'visible' ? { status: 'held', flags: FieldValue.arrayUnion('reported') } : {}) });
  });
});

/** Moderators (custom claim `mod`) and the series' creators resolve held comments. */
export const moderate = onCall({ enforceAppCheck: APP_CHECK }, async (req) => {
  const uid = requireUser(req);
  const path = String(req.data?.path ?? '');
  const action = String(req.data?.action ?? '');
  if (!COMMENT_PATH.test(path) || !['approve', 'remove'].includes(action)) throw new HttpsError('invalid-argument', 'Bad request');
  const slug = path.split('/')[1];
  const series = await db.doc(`series/${slug}`).get();
  if (req.auth!.token.mod !== true && !(series.get('creatorIds') ?? []).includes(uid)) throw new HttpsError('permission-denied', 'Not allowed');
  await db.doc(path).update(action === 'approve' ? { status: 'visible', reviewedBy: uid } : { status: 'removed', body: '[removed]', reviewedBy: uid });
  const reports = await db.collection('reports').where('path', '==', path).get();
  const b = db.batch(); reports.forEach((r) => b.update(r.ref, { state: 'resolved' })); await b.commit();
  return { ok: true };
});
