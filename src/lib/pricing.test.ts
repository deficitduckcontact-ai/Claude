import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { evenly, quote, split, PER_ARTIST_CENTS } from './pricing';
import * as fnSplit from '../../functions/src/split';

describe('evenly', () => {
  it('never loses a cent', () => {
    for (const [t, n] of [[1000, 3], [7, 4], [0, 5], [849, 4]]) {
      const parts = evenly(t, n);
      expect(parts.reduce((a, b) => a + b, 0)).toBe(t);
      expect(Math.max(...parts) - Math.min(...parts)).toBeLessThanOrEqual(1);
    }
  });
});

describe('split', () => {
  const picks = [
    { slug: 'a', creatorUids: ['u1'] },
    { slug: 'b', creatorUids: ['u2', 'u3'] },
    { slug: 'c', creatorUids: ['u1'] },
    { slug: 'd', creatorUids: [] }
  ];
  it('pays creators 85% of gross and conserves every cent', () => {
    const gross = 4 * PER_ARTIST_CENTS; // $9.96
    const s = split(gross, picks);
    expect(s.creatorPoolCents).toBe(Math.round(gross * 0.85));
    const toCreators = Object.values(s.perCreator).reduce((a, b) => a + b, 0);
    expect(toCreators).toBe(s.creatorPoolCents);
    expect(s.creatorPoolCents + s.platformNetCents + s.feeCents).toBe(gross);
  });
  it('merges a creator with two series', () => {
    const s = split(4 * PER_ARTIST_CENTS, picks);
    expect(s.perCreator.u1).toBe(s.perSeries.a + s.perSeries.c);
    expect(s.perCreator.__unclaimed__).toBe(s.perSeries.d);
  });
  it('a single $2.49 pick costs the platform ~2¢; two picks turn positive', () => {
    expect(quote(1).platformNetCents).toBe(-2);
    expect(quote(2).platformNetCents).toBeGreaterThan(0);
  });
});

describe('functions copy', () => {
  it('matches the web copy byte-for-byte below the header', () => {
    const body = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8').split('\nexport const PER_ARTIST_CENTS')[1];
    expect(body('../../functions/src/split.ts')).toBe(body('./pricing.ts'));
    expect(fnSplit.split(996, [{ slug: 'x', creatorUids: ['u'] }])).toEqual(split(996, [{ slug: 'x', creatorUids: ['u'] }]));
  });
});
