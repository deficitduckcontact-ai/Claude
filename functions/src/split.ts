// TinyCoup money model. All amounts are integer cents.
//
// One Stripe subscription per reader. Its single line item is the
// "artist subscription" price with quantity = number of series picked, so
// picking a 5th artist is just quantity 4 → 5 (Stripe prorates).
// Each paid invoice is split: creators get 85% of gross, evenly across the
// picked series (then evenly across that series' creators). TinyCoup keeps
// 15% and pays Stripe's processing out of it.
//
// ⚠ COPY of src/lib/pricing.ts — keep in sync (enforced by src/lib/pricing.test.ts).

export const PER_ARTIST_CENTS = 249;
export const CURRENCY = 'usd';
export const CREATOR_SHARE = 0.85;
export const STRIPE_PCT = 0.029;
export const STRIPE_FIXED_CENTS = 30;
export const MAX_PICKS = 40;

export interface Pick {
  slug: string;
  creatorUids: string[];
}

export interface Split {
  grossCents: number;
  feeCents: number;
  creatorPoolCents: number;
  platformNetCents: number;
  perSeries: Record<string, number>;
  perCreator: Record<string, number>;
}

export const estimateStripeFee = (grossCents: number) =>
  grossCents <= 0 ? 0 : Math.round(grossCents * STRIPE_PCT) + STRIPE_FIXED_CENTS;

/** Divide `total` into `n` integer parts that differ by at most 1 cent (earlier parts get the extra). */
export function evenly(total: number, n: number): number[] {
  if (n <= 0) return [];
  const base = Math.floor(total / n);
  const extra = total - base * n;
  return Array.from({ length: n }, (_, i) => base + (i < extra ? 1 : 0));
}

export function split(grossCents: number, picks: Pick[], feeCents = estimateStripeFee(grossCents)): Split {
  const creatorPoolCents = picks.length ? Math.round(grossCents * CREATOR_SHARE) : 0;
  const perSeries: Record<string, number> = {};
  const perCreator: Record<string, number> = {};
  evenly(creatorPoolCents, picks.length).forEach((cents, i) => {
    const p = picks[i];
    perSeries[p.slug] = cents;
    const owners = p.creatorUids.length ? p.creatorUids : ['__unclaimed__'];
    evenly(cents, owners.length).forEach((c, j) => {
      perCreator[owners[j]] = (perCreator[owners[j]] ?? 0) + c;
    });
  });
  return {
    grossCents,
    feeCents,
    creatorPoolCents,
    platformNetCents: grossCents - creatorPoolCents - feeCents,
    perSeries,
    perCreator
  };
}

/** What a reader sees before paying. */
export function quote(nPicks: number) {
  const gross = Math.max(0, nPicks) * PER_ARTIST_CENTS;
  const fee = estimateStripeFee(gross);
  const creators = Math.round(gross * CREATOR_SHARE);
  return {
    monthlyCents: gross,
    perArtistToCreatorCents: nPicks ? Math.round(creators / nPicks) : 0,
    creatorsCents: creators,
    feeCents: fee,
    platformNetCents: gross - creators - fee
  };
}

export const money = (cents: number, currency = CURRENCY) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(cents / 100);
