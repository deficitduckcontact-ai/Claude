import { describe, expect, it } from 'vitest';
import { safeNext } from './nav';

describe('safeNext', () => {
  it('keeps local paths', () => {
    expect(safeNext('/subscribe')).toBe('/subscribe');
    expect(safeNext('/s/x/ep-1#comments')).toBe('/s/x/ep-1#comments');
  });
  it('blocks off-site redirects', () => {
    for (const bad of ['//evil.com', '/\\evil.com', 'https://evil.com', 'javascript:alert(1)', '/\\/evil.com', '', null]) {
      expect(safeNext(bad)).toBe('/');
    }
  });
});
