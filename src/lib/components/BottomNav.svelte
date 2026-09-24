<script lang="ts">
  import { page } from '$app/state';
  import { session } from '$lib/session.svelte';
  const tabs = [
    { href: '/', label: 'Home', d: 'M3 11l9-7 9 7v9a1 1 0 01-1 1h-5v-6h-6v6H4a1 1 0 01-1-1z' },
    { href: '/series', label: 'Series', d: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h16v7H4z' },
    { href: '/search', label: 'Search', d: 'M11 4a7 7 0 110 14 7 7 0 010-14zM20 20l-4-4' },
    { href: '/me/plan', label: 'Artists', d: 'M12 21s-7-4.5-9.5-9A5 5 0 0112 6a5 5 0 019.5 6c-2.5 4.5-9.5 9-9.5 9z' },
    { href: '/me', label: 'Me', d: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0' }
  ];
  const on = (h: string) => (h === '/' ? page.url.pathname === '/' : h === '/me' ? page.url.pathname === '/me' || page.url.pathname === '/login' : page.url.pathname.startsWith(h));
</script>

<nav class="bn mob-only" aria-label="Main">
  {#each tabs as t}
    <a href={t.href === '/me' && !session.account ? '/login' : t.href} class:on={on(t.href)}>
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d={t.d} /></svg>
      <span>{t.label}</span>
    </a>
  {/each}
</nav>

<style>
  .bn { position: fixed; left: 0; right: 0; bottom: 0; z-index: 30; height: calc(var(--bottom-nav) + env(safe-area-inset-bottom)); padding-bottom: env(safe-area-inset-bottom); background: var(--glass); backdrop-filter: blur(8px); border-top: 1px solid var(--line); display: none; }
  @media (max-width: 899px) { .bn { display: flex; } }
  a { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; font-size: 10.5px; font-weight: 600; color: var(--ink-4); text-decoration: none !important; }
  a.on { color: var(--brand); }
</style>
