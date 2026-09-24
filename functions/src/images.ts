// Image pipeline. Creators upload masters to uploads/{uid}/{draftId}/NN.ext,
// then call publishEpisode. For each panel we:
//   - auto-orient, convert to sRGB, strip metadata
//   - make AVIF + WebP at 1600 and 800, plus a 400 WebP thumb
//   - name files by content hash → immutable, cache forever at the CDN
// Free panels land in p/ (public). Premium panels (after the preview) land in
// premium/ (private) and are served by premiumPanels as signed URLs.
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { bucket, db, requireCreator } from './shared.js';

const IMMUTABLE = 'public, max-age=31536000, immutable';
const VARIANTS = [
  { w: 1600, fmt: 'avif', opts: { quality: 55, effort: 4 } },
  { w: 1600, fmt: 'webp', opts: { quality: 82 } },
  { w: 800, fmt: 'avif', opts: { quality: 55, effort: 4 } },
  { w: 800, fmt: 'webp', opts: { quality: 82 } },
  { w: 400, fmt: 'webp', opts: { quality: 78 } }
] as const;

export interface StoredPanel { base: string; w: number; h: number }

export async function derive(master: Buffer, area: 'p' | 'premium'): Promise<StoredPanel> {
  const hash = createHash('sha256').update(master).digest('hex').slice(0, 20);
  const base = `${area}/${hash}`;
  const img = sharp(master, { failOn: 'error' }).rotate().toColourspace('srgb');
  const meta = await img.metadata();
  const b = bucket();
  let outW = 0, outH = 0;
  await Promise.all(VARIANTS.map(async (v) => {
    const pipeline = img.clone().resize({ width: v.w, height: v.w, fit: 'inside', withoutEnlargement: true });
    const { data, info } = await (v.fmt === 'avif' ? pipeline.avif(v.opts) : pipeline.webp(v.opts)).toBuffer({ resolveWithObject: true });
    if (v.w === 1600 && v.fmt === 'webp') { outW = info.width; outH = info.height; }
    await b.file(`${base}-${v.w}.${v.fmt}`).save(data, {
      resumable: false,
      metadata: { contentType: `image/${v.fmt}`, cacheControl: area === 'p' ? IMMUTABLE : 'private, max-age=0' }
    });
  }));
  return { base, w: outW || meta.width || 1600, h: outH || meta.height || 1600 };
}

export const publishEpisode = onCall({ memory: '2GiB', timeoutSeconds: 300, cpu: 2 }, async (req) => {
  const uid = requireCreator(req);
  const { draftId, slug, title, caption = '', premium = false, count, scheduleAt } = req.data ?? {};
  if (typeof draftId !== 'string' || !/^[\w-]{8,64}$/.test(draftId)) throw new HttpsError('invalid-argument', 'Bad draft');
  if (typeof title !== 'string' || !title.trim() || title.length > 80) throw new HttpsError('invalid-argument', 'Title required (≤80 chars)');
  const seriesRef = db.doc(`series/${slug}`);
  const series = await seriesRef.get();
  if (!series.exists || !(series.get('creatorIds') ?? []).includes(uid)) throw new HttpsError('permission-denied', 'Not your series');

  const [files] = await bucket().getFiles({ prefix: `uploads/${uid}/${draftId}/` });
  files.sort((a, b) => a.name.localeCompare(b.name));
  if (!files.length || files.length !== count || files.length > 20) throw new HttpsError('failed-precondition', 'Uploads incomplete — try again');

  const panels: StoredPanel[] = [];
  for (const [i, f] of files.entries()) {
    const [buf] = await f.download();
    panels.push(await derive(buf, premium && i > 0 ? 'premium' : 'p'));
  }

  const publishedAt = typeof scheduleAt === 'number' && scheduleAt > Date.now() ? Timestamp.fromMillis(scheduleAt) : Timestamp.now();
  // TODO(schedule): status 'scheduled' + a scheduled function that flips it at publishedAt.
  const id = await db.runTransaction(async (tx) => {
    const s = await tx.get(seriesRef);
    const number = (s.get('episodeCount') ?? 0) + 1;
    const epRef = seriesRef.collection('episodes').doc(`ep-${number}`);
    tx.set(epRef, {
      slug, number, title: title.trim(), caption: String(caption).slice(0, 600), premium: !!premium, status: 'published',
      publishedAt, likes: 0, comments: 0, views: 0, hot: 0,
      panels: premium ? [] : panels,
      preview: premium ? panels[0] : null,
      panelCount: panels.length,
      createdBy: uid
    });
    if (premium) tx.set(epRef.collection('private').doc('panels'), { panels });
    tx.update(seriesRef, { episodeCount: number, lastEpisodeAt: publishedAt });
    return epRef.id;
  });
  // Masters stay in uploads/ as the archive of record.
  // TODO(storage): move masters to a Coldline bucket via lifecycle rule after 30 days.
  // TODO(build): trigger a site rebuild (GitHub Actions dispatch) so the new episode gets prerendered HTML + OG tags.
  return { slug, id };
});
