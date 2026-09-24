<script lang="ts">
  import { browser } from '$app/environment';
  import { page } from '$app/state';
  import Cover from './Cover.svelte';
  import { session } from '$lib/session.svelte';
  import { allSeries, episodesOf, epKey } from '$lib/data';

  const series = $derived(allSeries());
  const mine = $derived(series.filter((s) => session.follows.includes(s.slug)));
  const list = $derived(mine.length ? mine : series.slice().sort((a, b) => b.followers - a.followers).slice(0, 8));
  const unread = (slug: string) => { const e = episodesOf(slug)[0]; return !!e && !session.reads.includes(epKey(e)); };
  const sortParam = $derived(browser ? page.url.searchParams.get('sort') : null); // no query string at prerender
</script>

<aside class="rail left" aria-label="Your series">
  <nav class="nav">
    <a href="/" class:on={page.url.pathname === '/' && sortParam !== 'following'}>🏠 Home</a>
    <a href="/?sort=following" class:on={sortParam === 'following'}>★ Following</a>
    <a href="/series" class:on={page.url.pathname === '/series'}>▦ All series</a>
    {#if session.isCreator}<a href="/studio">✎ Creator studio</a>{/if}
  </nav>
  <h4>{mine.length ? 'Your series' : 'Popular series'}</h4>
  <ul>
    {#each list as s (s.slug)}
      <li>
        <a href="/s/{s.slug}" class:on={page.url.pathname.startsWith(`/s/${s.slug}`)}>
          <Cover series={s} size={24} radius={6} />
          <span class="t">{s.title}</span>
          {#if mine.length && unread(s.slug)}<span class="dot" title="New episode"></span>{/if}
        </a>
      </li>
    {/each}
  </ul>
  {#if !mine.length}<p class="hint faint">Follow a series and it lives here, with a dot when there's a new episode.</p>{/if}
</aside>

<style>
  .nav { display: flex; flex-direction: column; gap: 2px; margin-bottom: 14px; }
  .nav a, ul a { display: flex; align-items: center; gap: 10px; padding: 7px 10px; border-radius: 8px; color: var(--ink-3); font-size: 14px; font-weight: 500; text-decoration: none; }
  .nav a:hover, ul a:hover { background: rgba(0, 0, 0, 0.04); }
  .nav a.on, ul a.on { background: #fff; color: var(--ink); box-shadow: var(--shadow-sm); }
  h4 { font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ink-4); margin: 6px 10px 6px; }
  ul { list-style: none; margin: 0; padding: 0; }
  .t { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .dot { width: 8px; height: 8px; border-radius: 99px; background: var(--coup); flex: 0 0 auto; }
  .hint { font-size: 12px; margin: 8px 10px; }
</style>
