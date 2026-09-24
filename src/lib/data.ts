// Read side. Seed data is always available (and is what gets prerendered);
// demo-mode uploads live in localStorage; live mode merges Firestore.
import { CREATORS, EPISODES, SERIES } from './seed';
import { mode, fb, resolveMode } from './firebase.svelte';
import { session } from './session.svelte';
import type { Creator, Episode, Series, SortMode } from './types';

const LOCAL_EPS = 'tc:episodes';
const LOCAL_SERIES = 'tc:series';
const browser = typeof window !== 'undefined';

function local<T>(key: string): T[] {
  // Only after hydration, so prerendered HTML and the first client render agree.
  // Reading session.localRev makes every $derived that calls this reactive to saves.
  if (!browser || !session.ready || session.localRev < 0) return [];
  try { return JSON.parse(localStorage.getItem(key) ?? '[]'); } catch { return []; }
}
export function saveLocal<T>(key: 'tc:episodes' | 'tc:series', item: T) {
  const all = [item, ...local<T>(key)];
  try { localStorage.setItem(key, JSON.stringify(all)); session.localRev++; }
  catch { throw new Error('Browser storage is full — demo mode keeps uploads locally. Remove a demo episode or connect Firebase.'); }
}

export function allSeries(): Series[] {
  const live = session.liveSeries;
  const seen = new Set(live.map((s) => s.slug));
  return [...local<Series>(LOCAL_SERIES), ...live, ...SERIES.filter((s) => !seen.has(s.slug))];
}
export const getSeries = (slug: string) => allSeries().find((s) => s.slug === slug);
export const getCreator = (uid: string): Creator | undefined =>
  session.liveCreators.find((c) => c.uid === uid) ?? CREATORS.find((c) => c.uid === uid);
export const creatorsOf = (s: Series) => s.creatorUids.map(getCreator).filter(Boolean) as Creator[];
export const creatorLine = (s: Series) => creatorsOf(s).map((c) => c.name).join(' & ') || 'New creator';

export function allEpisodes(): Episode[] {
  return [...local<Episode>(LOCAL_EPS), ...EPISODES];
}
export const episodesOf = (slug: string) => allEpisodes().filter((e) => e.slug === slug).sort((a, b) => b.number - a.number);
export const getEpisode = (slug: string, id: string) => allEpisodes().find((e) => e.slug === slug && e.id === id);
export const epKey = (e: Pick<Episode, 'slug' | 'id'>) => `${e.slug}__${e.id}`;

/** Reddit-style hot: likes decay with age (gravity 1.6). Stored as `hot` in live mode by a scheduled function. */
export const hotScore = (e: Episode, now: number) => (e.likes + e.comments * 2 + 1) / Math.pow((now - e.publishedAt) / 3600_000 + 2, 1.6);

export function sortFeed(eps: Episode[], mode: SortMode, now: number, follows: string[]) {
  const list = mode === 'following' ? eps.filter((e) => follows.includes(e.slug)) : eps.slice();
  if (mode === 'top') return list.sort((a, b) => b.likes - a.likes);
  if (mode === 'hot') return list.sort((a, b) => hotScore(b, now) - hotScore(a, now));
  return list.sort((a, b) => b.publishedAt - a.publishedAt);
}

/** Live mode: newest published episodes from Firestore, merged over seed. */
export async function liveEpisodes(max = 60): Promise<Episode[]> {
  await resolveMode();
  if (!mode.live) return [];
  const { db } = await fb();
  const f = await import('firebase/firestore');
  const q = f.query(f.collectionGroup(db, 'episodes'), f.where('status', '==', 'published'), f.orderBy('publishedAt', 'desc'), f.limit(max));
  const snap = await f.getDocs(q);
  return snap.docs.map((d) => {
    const x = d.data();
    return {
      id: d.id, slug: x.slug, number: x.number, title: x.title, caption: x.caption,
      publishedAt: x.publishedAt?.toMillis?.() ?? x.publishedAt, premium: !!x.premium,
      // Premium episodes expose only a public preview panel + a count; the
      // rest are fetched as signed URLs by the reader (api.premiumPanels).
      panels: x.premium
        ? [
            ...(x.preview ? [{ kind: 'img' as const, ...x.preview }] : []),
            ...Array.from({ length: Math.max(0, (x.panelCount ?? 1) - (x.preview ? 1 : 0)) }, (_, n) => ({ kind: 'locked' as const, n }))
          ]
        : (x.panels ?? []).map((p: { base: string; w: number; h: number; alt?: string }) => ({ kind: 'img' as const, ...p })),
      likes: x.likes ?? 0, comments: x.comments ?? 0, views: x.views ?? 0
    } satisfies Episode;
  });
}

/** Live mode: one episode not present at build time (published since the last deploy). */
export async function liveEpisode(slug: string, id: string): Promise<Episode | null> {
  await resolveMode();
  if (!mode.live) return null;
  const { db } = await fb();
  const f = await import('firebase/firestore');
  const d = await f.getDoc(f.doc(db, 'series', slug, 'episodes', id));
  if (!d.exists()) return null;
  // TODO(live): share the mapper with liveEpisodes() (currently duplicated shape)
  const x = d.data();
  return {
    id: d.id, slug, number: x.number, title: x.title, caption: x.caption, publishedAt: x.publishedAt?.toMillis?.() ?? 0,
    premium: !!x.premium, likes: x.likes ?? 0, comments: x.comments ?? 0, views: x.views ?? 0,
    panels: x.premium
      ? [...(x.preview ? [{ kind: 'img' as const, ...x.preview }] : []), ...Array.from({ length: Math.max(0, (x.panelCount ?? 1) - (x.preview ? 1 : 0)) }, (_, n) => ({ kind: 'locked' as const, n }))]
      : (x.panels ?? []).map((p: { base: string; w: number; h: number }) => ({ kind: 'img' as const, ...p }))
  };
}
