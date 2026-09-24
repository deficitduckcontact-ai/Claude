// Night mode: 'system' follows the OS; 'light'/'dark' are explicit choices.
// The choice is applied before first paint by the inline script in app.html.
export type Theme = 'system' | 'light' | 'dark';
const KEY = 'tc:theme';

class ThemeState {
  choice = $state<Theme>('system');
  init() {
    try { const t = localStorage.getItem(KEY); if (t === 'dark' || t === 'light') this.choice = t; } catch { /* private mode */ }
  }
  /** What's actually showing right now. */
  get effective(): 'light' | 'dark' {
    if (this.choice !== 'system') return this.choice;
    return typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  set(t: Theme) {
    this.choice = t;
    try { if (t === 'system') localStorage.removeItem(KEY); else localStorage.setItem(KEY, t); } catch { /* ignore */ }
    if (t === 'system') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = t;
    document.querySelector('meta[name=theme-color]')?.setAttribute('content', this.effective === 'dark' ? '#242526' : '#1877F2');
  }
  toggle() { this.set(this.effective === 'dark' ? 'light' : 'dark'); }
}
export const theme = new ThemeState();
