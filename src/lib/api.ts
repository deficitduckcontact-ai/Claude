// Write side: everything that needs privilege goes through Cloud Functions.
// Each function has a DEMO fallback so the flows are clickable today.
import { LIVE, call, fb } from './firebase';
import { saveLocal, allSeries } from './data';
import { session } from './session.svelte';
import { SEED_NOW } from './seed';
import type { Comment, Episode, PanelSrc, Series } from './types';

const demoWait = (ms = 600) => new Promise((r) => setTimeout(r, ms));

// ---------------- subscriptions ----------------

/** New subscriber → Stripe Checkout. Returns a URL to navigate to. */
export async function startCheckout(picks: string[], interval: 'month' | 'year' = 'month'): Promise<string> {
  if (!picks.length) throw new Error('Pick at least one artist');
  if (LIVE) return (await call<{ url: string }>('createCheckout', { picks, interval, origin: location.origin })).url;
  await demoWait();
  session.setSub({ status: 'active', picks, since: Date.now(), currentPeriodEnd: Date.now() + 30 * 864e5 });
  return '/subscribe/success';
}

/** Existing subscriber changes who they back (quantity change, prorated). */
export async function updatePicks(picks: string[]) {
  if (!picks.length) throw new Error('Keep at least one artist, or cancel from Billing');
  if (LIVE) return void (await call('updatePicks', { picks }));
  await demoWait(400);
  session.setSub({ ...session.sub, status: 'active', picks });
}

/** Stripe Customer Portal: card, invoices, cancel. */
export async function openBillingPortal(): Promise<string> {
  if (LIVE) return (await call<{ url: string }>('billingPortal', { origin: location.origin })).url;
  await demoWait(300);
  return '/me/billing';
}

export async function cancelDemo() {
  session.setSub({ status: 'canceled', picks: session.sub.picks });
}

// ---------------- creators ----------------

/** Becomes a creator + returns the Stripe Connect Express onboarding URL. */
export async function creatorOnboard(): Promise<string> {
  if (LIVE) return (await call<{ url: string }>('creatorOnboard', { origin: location.origin })).url;
  await demoWait();
  session.setCreator(true);
  return '/studio?onboarded=1';
}

export async function createSeries(input: { title: string; tagline: string; about: string; tags: string[] }): Promise<string> {
  const slug = input.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
  if (!slug) throw new Error('Give your series a title');
  if (allSeries().some((s) => s.slug === slug)) throw new Error('That series name is taken');
  if (LIVE) return (await call<{ slug: string }>('createSeries', input)).slug;
  const s: Series = { slug, ...input, creatorUids: [session.account!.uid], hue: Math.floor(Math.random() * 360), followers: 0, schedule: 'Whenever' };
  saveLocal('tc:series', s);
  return slug;
}

export interface Draft {
  slug: string;
  title: string;
  caption: string;
  premium: boolean;
  files: File[];
  scheduleAt?: number;
}

/**
 * Publish: upload masters to Storage (uploads/{uid}/{draftId}/NN.ext); the
 * publishEpisode function derives AVIF/WebP @1600/800 + 400 thumb, hashes
 * them, writes the episode doc. Progress callback gets 0..1.
 */
export async function publishEpisode(d: Draft, progress: (p: number) => void): Promise<{ slug: string; id: string }> {
  if (!d.files.length) throw new Error('Add at least one panel');
  if (d.files.length > 20) throw new Error('20 panels max per episode');
  if (LIVE) {
    const { storage } = await fb();
    const s = await import('firebase/storage');
    const draftId = crypto.randomUUID();
    let done = 0;
    await Promise.all(d.files.map(async (file, i) => {
      const ext = file.name.split('.').pop()?.toLowerCase() ?? 'png';
      const ref = s.ref(storage, `uploads/${session.account!.uid}/${draftId}/${String(i).padStart(2, '0')}.${ext}`);
      await s.uploadBytes(ref, file, { contentType: file.type });
      progress(++done / (d.files.length + 1));
    }));
    const res = await call<{ slug: string; id: string }>('publishEpisode', {
      draftId, slug: d.slug, title: d.title, caption: d.caption, premium: d.premium, count: d.files.length, scheduleAt: d.scheduleAt
    });
    progress(1);
    return res;
  }
  // DEMO: downscale in the browser and keep it in localStorage.
  const panels: PanelSrc[] = [];
  for (const [i, f] of d.files.entries()) {
    panels.push({ kind: 'url', src: await shrink(f, 800), w: 800, h: 800 });
    progress((i + 1) / d.files.length);
  }
  const existing = (await import('./data')).episodesOf(d.slug);
  const number = (existing[0]?.number ?? 0) + 1;
  const ep: Episode = {
    id: `ep-${number}-${Date.now().toString(36)}`, slug: d.slug, number, title: d.title, caption: d.caption || undefined,
    publishedAt: Math.max(Date.now(), SEED_NOW), premium: d.premium, panels, likes: 0, comments: 0, views: 0
  };
  saveLocal('tc:episodes', ep);
  return { slug: ep.slug, id: ep.id };
}

async function shrink(file: File, size: number): Promise<string> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, size / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
  return c.toDataURL('image/webp', 0.8);
}

/** Signed, short-lived URLs for premium panels (subscribers only). */
export async function premiumPanels(slug: string, id: string): Promise<PanelSrc[] | null> {
  if (!LIVE) return null; // demo: seed art is already present, the paywall is purely visual
  const r = await call<{ panels: { src: string; w: number; h: number }[] }>('premiumPanels', { slug, id });
  return r.panels.map((p) => ({ kind: 'url', ...p }));
}

// ---------------- comments ----------------
const CKEY = (slug: string, id: string) => `tc:comments:${slug}:${id}`;

export async function listComments(slug: string, id: string): Promise<Comment[]> {
  if (LIVE) {
    const { db } = await fb();
    const f = await import('firebase/firestore');
    const snap = await f.getDocs(f.query(f.collection(db, 'series', slug, 'episodes', id, 'comments'), f.orderBy('createdAt', 'asc'), f.limit(200)));
    return snap.docs.map((d) => ({ id: d.id, uid: d.data().uid, handle: d.data().handle, body: d.data().body, createdAt: d.data().createdAt?.toMillis?.() ?? Date.now() }));
  }
  try { return JSON.parse(localStorage.getItem(CKEY(slug, id)) ?? '[]'); } catch { return []; }
}

export async function postComment(slug: string, id: string, body: string): Promise<Comment> {
  const a = session.account;
  if (!a) throw new Error('Sign in to comment');
  body = body.trim();
  if (!body) throw new Error('Say something first');
  if (LIVE) {
    const { db } = await fb();
    const f = await import('firebase/firestore');
    const ref = await f.addDoc(f.collection(db, 'series', slug, 'episodes', id, 'comments'), { uid: a.uid, handle: a.handle, body, createdAt: f.serverTimestamp() });
    return { id: ref.id, uid: a.uid, handle: a.handle, body, createdAt: Date.now() };
  }
  const c: Comment = { id: crypto.randomUUID(), uid: a.uid, handle: a.handle, body, createdAt: Date.now() };
  localStorage.setItem(CKEY(slug, id), JSON.stringify([...(await listComments(slug, id)), c]));
  return c;
}

export async function joinWaitlist(email: string, creator: boolean) {
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error('That email looks off');
  if (LIVE) {
    const { db } = await fb();
    const f = await import('firebase/firestore');
    await f.addDoc(f.collection(db, 'waitlist'), { email, creator, createdAt: f.serverTimestamp() });
    return;
  }
  await demoWait(300);
}
