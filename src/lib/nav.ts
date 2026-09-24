/**
 * Only allow same-site relative redirects after login. Rejects "//evil.com"
 * and "/\\evil.com" (browsers treat a backslash like a slash) and anything
 * with a scheme.
 */
export function safeNext(raw: string | null | undefined): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.includes('\\')) return '/';
  try {
    const u = new URL(raw, 'https://x.invalid');
    return u.origin === 'https://x.invalid' ? u.pathname + u.search + u.hash : '/';
  } catch { return '/'; }
}
