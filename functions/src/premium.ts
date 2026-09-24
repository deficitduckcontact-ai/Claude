import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { bucket, db, episodeArg, requireUser, slugArg, APP_CHECK } from './shared.js';
import type { StoredPanel } from './images.js';

// Any active subscription unlocks every premium episode (picks only route money).
export const premiumPanels = onCall({ enforceAppCheck: APP_CHECK }, async (req) => {
  const uid = requireUser(req);
  const slug = slugArg(req.data?.slug);
  const id = episodeArg(req.data?.id);
  const sub = await db.doc(`subscriptions/${uid}`).get();
  if (!['active', 'past_due', 'trialing'].includes(sub.get('status'))) throw new HttpsError('permission-denied', 'Subscribe to read premium comics');
  const ep = db.doc(`series/${slug}/episodes/${id}`);
  const [pub, priv] = await Promise.all([ep.get(), ep.collection('private').doc('panels').get()]);
  if (!pub.exists || pub.get('status') !== 'published') throw new HttpsError('not-found', 'No such episode');
  const panels: StoredPanel[] = priv.get('panels') ?? pub.get('panels') ?? [];
  const expires = Date.now() + 15 * 60_000;
  const out = await Promise.all(panels.map(async (p) => {
    if (p.base.startsWith('p/')) return { src: `https://storage.googleapis.com/${bucket().name}/${p.base}-1600.webp`, w: p.w, h: p.h };
    const [src] = await bucket().file(`${p.base}-1600.webp`).getSignedUrl({ version: 'v4', action: 'read', expires });
    return { src, w: p.w, h: p.h };
  }));
  // TODO(perf): return avif + 800 variants too, and cache signed URLs per (episode, 10-min window).
  return { panels: out };
});
