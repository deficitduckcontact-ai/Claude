// PLACEHOLDER CONTENT. Every series, creator and comic here is invented so
// the site works end-to-end before launch creators upload their own work.
// TODO(launch): delete this file's data once Firestore has real series; the
// prerender step then reads from Firestore instead (see src/lib/data.ts).
import type { Creator, Episode, Series } from './types';

/** Fixed "now" so prerendered HTML and first client render agree. */
export const SEED_NOW = Date.UTC(2026, 8, 24, 16, 0, 0);
const H = 3600_000;

export const CREATORS: Creator[] = [
  { uid: 'c-ryan', name: 'Ryan K.', handle: 'ryank', bio: 'Draws dinosaurs with too many tabs open.' },
  { uid: 'c-mo', name: 'Mo Adeyemi', handle: 'moadeyemi', bio: 'Parenting, but make it slapstick.' },
  { uid: 'c-lin', name: 'Lin Park', handle: 'linpark', bio: 'Science jokes, peer reviewed by my cat.' },
  { uid: 'c-june', name: 'June Okafor', handle: 'june', bio: 'Tiny travel disasters in four panels.' },
  { uid: 'c-ash', name: 'Ash Varga', handle: 'ashv', bio: 'Politics, drawn angrily.' },
  { uid: 'c-bea', name: 'Bea Lund', handle: 'bealund', bio: 'Soft comics about hard days.' },
  { uid: 'c-tom', name: 'Tomás Ruiz', handle: 'tomas', bio: 'Office life. Mostly the printer.' },
  { uid: 'c-kit', name: 'Kit Moreau', handle: 'kitm', bio: 'Cats who have opinions about you.' },
  { uid: 'c-sam', name: 'Sam & Dee', handle: 'samdee', bio: 'Two people, one pen, zero plans.' },
  { uid: 'c-noor', name: 'Noor Haddad', handle: 'noor', bio: 'History that should have been a sitcom.' }
];

const s = (slug: string, title: string, tagline: string, uids: string[], hue: number, followers: number, tags: string[], schedule: string): Series => ({
  slug, title, tagline, creatorUids: uids, hue, followers, tags, schedule,
  about: `${title} is a placeholder series for the TinyCoup preview. ${tagline} New episodes ${schedule.toLowerCase()}.`
});

export const SERIES: Series[] = [
  s('adhdinos', 'ADHDinos', 'Prehistoric brains, modern problems.', ['c-ryan'], 145, 2797, ['humor', 'adhd'], 'Mon & Thu'),
  s('small-hours', 'Small Hours', 'Parenting at 3am.', ['c-mo'], 28, 18400, ['family', 'humor'], 'Weekly'),
  s('lab-notes', 'Lab Notes', 'Science, loosely supervised.', ['c-lin'], 200, 12100, ['science', 'humor'], 'Tue'),
  s('wrong-gate', 'Wrong Gate', 'A traveller who is always slightly lost.', ['c-june'], 12, 9215, ['travel'], 'Fri'),
  s('op-ed-ink', 'Op-Ed Ink', 'The news, redrawn.', ['c-ash'], 355, 6724, ['politics'], 'Daily'),
  s('soft-days', 'Soft Days', 'Gentle comics for rough weeks.', ['c-bea'], 300, 21100, ['wellbeing'], 'Sun'),
  s('paper-jam', 'Paper Jam', 'Office comedy starring the printer.', ['c-tom'], 45, 4892, ['work', 'humor'], 'Wed'),
  s('cat-opinions', 'Cat Opinions', 'They have notes.', ['c-kit'], 260, 30000, ['animals', 'humor'], 'Mon–Fri'),
  s('no-plans', 'No Plans', 'Two friends improvising adulthood.', ['c-sam'], 85, 3596, ['slice of life'], 'Biweekly'),
  s('brief-ages', 'Brief Ages', 'History, abridged and embellished.', ['c-noor'], 180, 7076, ['history', 'education'], 'Sat')
];

const TITLES = [
  'The Plan', 'Five More Minutes', 'Snack Logic', 'Out of Office', 'A Small Victory', 'Group Chat',
  'Monday Again', 'The Long Way', 'Just Checking', 'Bonus Round', 'Weather Report', 'Plot Twist'
];

function rng(seed: string) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909)) >>> 0) / 4294967296;
}

export const EPISODES: Episode[] = SERIES.flatMap((se, si) => {
  const r = rng(se.slug);
  const count = 6 + Math.floor(r() * 4);
  return Array.from({ length: count }, (_, i) => {
    const number = count - i;
    const nPanels = r() < 0.3 ? 1 : 3 + Math.floor(r() * 4);
    const premium = number % 4 === 0;
    const age = (i * (30 + si * 7) + si * 5 + r() * 20) * H;
    return {
      id: `ep-${number}`,
      slug: se.slug,
      number,
      title: TITLES[(number + si) % TITLES.length],
      caption: r() < 0.5 ? 'Placeholder episode — real comics arrive at launch.' : undefined,
      publishedAt: SEED_NOW - Math.round(age),
      premium,
      panels: Array.from({ length: nPanels }, (_, n) => ({ kind: 'art' as const, seed: `${se.slug}/${number}`, n })),
      likes: Math.round(se.followers * (0.004 + r() * 0.02)),
      comments: Math.round(r() * 40),
      views: Math.round(se.followers * (0.2 + r()))
    };
  });
});
