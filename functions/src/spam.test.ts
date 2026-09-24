import { describe, expect, it } from 'vitest';
import { checkComment, isDisposableEmail, rateLimit } from './spam';

const old = 30 * 864e5;
const c = (body: string, accountAgeMs = old, recentBodies: string[] = []) => checkComment({ body, accountAgeMs, recentBodies });

describe('checkComment', () => {
  it('allows normal comments', () => {
    expect(c('Ha! The printer one got me.').action).toBe('allow');
    expect(c('Panel 3 is so real 😂').action).toBe('allow');
  });
  it('rejects empties and duplicates', () => {
    expect(c('   ').action).toBe('reject');
    expect(c('Great one!', old, ['great one']).action).toBe('reject');
  });
  it('holds likely spam for review', () => {
    expect(c('DM me on Telegram for a crypto giveaway').action).toBe('hold');
    expect(c('check out mysite.xyz', 3600_000).reasons).toContain('link from new account');
    expect(c('a http://a.com b http://b.com c http://c.com').reasons).toContain('many links');
    expect(c('THIS IS THE WORST COMIC I HAVE EVER SEEN').reasons).toContain('shouting');
    expect(c('call me at +1 (555) 123-4567').reasons).toContain('contact details');
  });
  it('lets established accounts share one link', () => {
    expect(c('source: https://en.wikipedia.org/wiki/Dinosaur').action).toBe('allow');
  });
});

describe('rateLimit', () => {
  it('caps bursts and resets after a minute', () => {
    let s; const t = 1_000_000;
    for (let i = 0; i < 5; i++) { const r = rateLimit(s, t + i); expect(r.ok).toBe(true); s = r.next; }
    expect(rateLimit(s, t + 10).ok).toBe(false);
    expect(rateLimit(s, t + 61_000).ok).toBe(true);
  });
});

describe('isDisposableEmail', () => {
  it('flags throwaway domains only', () => {
    expect(isDisposableEmail('x@mailinator.com')).toBe(true);
    expect(isDisposableEmail('x@gmail.com')).toBe(false);
  });
});
