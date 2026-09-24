// Spam checks for comments and sign-ups. Pure functions (no imports) so the
// web app's demo mode and the tests use exactly the same rules as the server.

export type SpamAction = 'allow' | 'hold' | 'reject';
export interface SpamVerdict { action: SpamAction; reasons: string[] }

export interface CommentContext {
  body: string;
  accountAgeMs: number;
  recentBodies: string[]; // this user's last few comments, newest first
}

// Throwaway inboxes used by bots. Not exhaustive — the blocking function and
// App Check do the heavy lifting; this just removes the laziest attempts.
export const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com', 'guerrillamail.com', 'guerrillamail.net', 'sharklasers.com', '10minutemail.com', 'tempmail.com',
  'temp-mail.org', 'yopmail.com', 'trashmail.com', 'getnada.com', 'dispostable.com', 'maildrop.cc',
  'throwawaymail.com', 'fakeinbox.com', 'moakt.com', 'emailondeck.com', 'mintemail.com', 'tempmailo.com', 'mohmal.com'
]);

export function isDisposableEmail(email: string): boolean {
  const domain = email.trim().toLowerCase().split('@')[1] ?? '';
  return DISPOSABLE_DOMAINS.has(domain) || [...DISPOSABLE_DOMAINS].some((d) => domain.endsWith('.' + d));
}

const SPAM_PHRASES = [
  'crypto giveaway', 'free followers', 'dm me on telegram', 'whatsapp me', 'investment opportunity', 'guaranteed profit',
  'click my profile', 'check my bio', 'onlyfans', 'casino', 'viagra', 'forex signals', 'work from home and earn'
];
const LINK_RE = /(https?:\/\/|www\.)\S+|\b[a-z0-9-]+\.(com|net|org|io|ru|xyz|top|link|click|shop|site)\b/gi;
const CONTACT_RE = /\+?\d[\d\s().-]{8,}\d|[\w.+-]+@[\w-]+\.[\w.]+/;
const DAY = 864e5;

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').replace(/[^\p{L}\p{N} ]/gu, '').trim();

export function checkComment({ body, accountAgeMs, recentBodies }: CommentContext): SpamVerdict {
  const text = body.trim();
  const reasons: string[] = [];
  if (!text) return { action: 'reject', reasons: ['empty'] };
  if (text.length > 4000) return { action: 'reject', reasons: ['too long'] };
  if (recentBodies.some((b) => norm(b) === norm(text) && norm(text).length > 0)) return { action: 'reject', reasons: ['duplicate'] };

  const links = text.match(LINK_RE)?.length ?? 0;
  const lower = text.toLowerCase();
  const letters = text.replace(/[^A-Za-z]/g, '');
  if (links > 2) reasons.push('many links');
  if (links > 0 && accountAgeMs < 3 * DAY) reasons.push('link from new account');
  if (SPAM_PHRASES.some((p) => lower.includes(p))) reasons.push('spam phrase');
  if (CONTACT_RE.test(text)) reasons.push('contact details');
  if (letters.length >= 20 && letters.replace(/[^A-Z]/g, '').length / letters.length > 0.7) reasons.push('shouting');
  if (/(.)\1{9,}/.test(text)) reasons.push('repeated characters');
  return { action: reasons.length ? 'hold' : 'allow', reasons };
}

/** Sliding counters: at most `perMinute` comments a minute and `perDay` a day. */
export interface RateState { minuteStart: number; minuteCount: number; dayStart: number; dayCount: number }
export function rateLimit(prev: RateState | undefined, now: number, perMinute = 5, perDay = 60): { ok: boolean; next: RateState } {
  const s = prev ?? { minuteStart: now, minuteCount: 0, dayStart: now, dayCount: 0 };
  const next = {
    minuteStart: now - s.minuteStart >= 60_000 ? now : s.minuteStart,
    minuteCount: now - s.minuteStart >= 60_000 ? 0 : s.minuteCount,
    dayStart: now - s.dayStart >= DAY ? now : s.dayStart,
    dayCount: now - s.dayStart >= DAY ? 0 : s.dayCount
  };
  if (next.minuteCount >= perMinute || next.dayCount >= perDay) return { ok: false, next };
  return { ok: true, next: { ...next, minuteCount: next.minuteCount + 1, dayCount: next.dayCount + 1 } };
}
