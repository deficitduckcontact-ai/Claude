// Counters are derived server-side from per-user docs, so clients can't fake them
// and we never write one doc per view.
import { onDocumentCreated, onDocumentDeleted } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { db } from './shared.js';

const epRef = (key: string) => { const [slug, id] = key.split('__'); return db.doc(`series/${slug}/episodes/${id}`); };
const bump = (ref: FirebaseFirestore.DocumentReference, field: string, n: number) =>
  ref.update({ [field]: FieldValue.increment(n) }).catch(() => { /* target deleted */ });

export const onLike = onDocumentCreated('users/{uid}/likes/{key}', (e) => bump(epRef(e.params.key), 'likes', 1));
export const onUnlike = onDocumentDeleted('users/{uid}/likes/{key}', (e) => bump(epRef(e.params.key), 'likes', -1));
export const onFollow = onDocumentCreated('users/{uid}/follows/{slug}', (e) => bump(db.doc(`series/${e.params.slug}`), 'followers', 1));
export const onUnfollow = onDocumentDeleted('users/{uid}/follows/{slug}', (e) => bump(db.doc(`series/${e.params.slug}`), 'followers', -1));
export const onComment = onDocumentCreated('series/{slug}/episodes/{id}/comments/{cid}', (e) => bump(db.doc(`series/${e.params.slug}/episodes/${e.params.id}`), 'comments', 1));
// TODO(views): count views in batches (client pings a callable at most once per episode per session → sharded counter).

/** Recompute the Hot score for recent episodes (same formula as src/lib/data.ts hotScore). */
export const refreshHot = onSchedule('every 15 minutes', async () => {
  const since = Timestamp.fromMillis(Date.now() - 7 * 864e5);
  const snap = await db.collectionGroup('episodes').where('status', '==', 'published').where('publishedAt', '>=', since).get();
  const w = db.bulkWriter();
  const now = Date.now();
  snap.forEach((d) => {
    const age = (now - d.get('publishedAt').toMillis()) / 3600_000;
    w.update(d.ref, { hot: ((d.get('likes') ?? 0) + (d.get('comments') ?? 0) * 2 + 1) / Math.pow(age + 2, 1.6) });
  });
  await w.close();
});
