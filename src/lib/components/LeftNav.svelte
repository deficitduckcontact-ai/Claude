<script lang="ts">
  // New-reddit / Tinyview left column: main feeds, then your series.
  import { browser } from '$app/environment';
  import { page } from '$app/state';
  import Cover from './Cover.svelte';
  import { session } from '$lib/session.svelte';
  import { allSeries, episodesOf, epKey } from '$lib/data';

  const sort = $derived(browser && page.url.pathname === '/' ? (page.url.searchParams.get('sort') ?? session.sort) : '');
  const series = $derived(allSeries());
  const mine = $derived(series.filter((s) => session.follows.includes(s.slug)));
  const popular = $derived(series.slice().sort((a, b) => b.followers - a.followers).slice(0, 6));
  const unread = (slug: string) => { const e = episodesOf(slug)[0]; return !!e && !session.reads.includes(epKey(e)); };
  const I = {
    home: 'M3 11l9-7 9 7v9a1 1 0 01-1 1h-5v-6h-6v6H4a1 1 0 01-1-1z',
    fire: 'M12 3s5 4.5 5 9.5a5 5 0 01-10 0C7 10 9 8.5 9 8.5s.5 3 2.5 3.5C11.5 8 12 3 12 3z',
    top: 'M4 17l6-6 4 4 6-7M14 8h6v6',
    star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z',
    grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
    pen: 'M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4'
  };
</script>

<aside class="rail left">
  <nav>
    <a href="/" class:on={page.url.pathname === '/' && (sort === 'hot' || sort === '')}><svg viewBox="0 0 24 24"><path d={I.home} /></svg>Home</a>
    <a href="/?sort=new" class:on={sort === 'new'}><svg viewBox="0 0 24 24"><path d={I.fire} /></svg>New</a>
    <a href="/?sort=top" class:on={sort === 'top'}><svg viewBox="0 0 24 24"><path d={I.top} /></svg>Top</a>
    <a href="/?sort=following" class:on={sort === 'following'}><svg viewBox="0 0 24 24"><path d={I.star} /></svg>Following</a>
    <a href="/series" class:on={page.url.pathname === '/series'}><svg viewBox="0 0 24 24"><path d={I.grid} /></svg>All series</a>
    {#if session.isCreator}<a href="/studio" class:on={page.url.pathname.startsWith('/studio')}><svg viewBox="0 0 24 24"><path d={I.pen} /></svg>Creator studio</a>{/if}
  </nav>

  <div class="k h">{mine.length ? 'Your series' : 'Popular series'}</div>
  <ul>
    {#each mine.length ? mine : popular as s (s.slug)}
      <li><a href="/s/{s.slug}" class:on={page.url.pathname.startsWith(`/s/${s.slug}`)}>
        <Cover series={s} size={28} radius={99} /><span class="t">{s.title}</span>
        {#if mine.length && unread(s.slug)}<span class="new" title="New episode"></span>{/if}
      </a></li>
    {/each}
  </ul>
  <a class="all" href="/series">Browse all series →</a>

  <div class="k h">TinyCoup</div>
  <nav class="sm">
    <a href="/how-it-works">How it works</a>
    <a href="/creators">For creators</a>
    <a href="/legal/rules">Community rules</a>
  </nav>
</aside>

<style>
  nav { display: flex; flex-direction: column; gap: 2px; }
  nav a, ul a { display: flex; align-items: center; gap: 12px; padding: 9px 12px; border-radius: 10px; color: var(--ink-2); font-size: 14.5px; font-weight: 500; text-decoration: none; }
  nav a:hover, ul a:hover { background: var(--surface-3); text-decoration: none; }
  nav a.on, ul a.on { background: var(--surface); color: var(--ink); font-weight: 600; box-shadow: var(--shadow-sm); }
  nav a.on svg { stroke: var(--brand); }
  svg { width: 20px; height: 20px; fill: none; stroke: currentColor; stroke-width: 1.9; stroke-linecap: round; stroke-linejoin: round; flex: 0 0 auto; }
  .h { margin: 20px 12px 6px; }
  ul { list-style: none; margin: 0; padding: 0; }
  .t { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .new { width: 8px; height: 8px; border-radius: 99px; background: var(--brand); }
  .all { display: block; padding: 8px 12px; font-size: 13px; color: var(--brand); font-weight: 600; }
  .sm a { font-size: 13px; padding: 6px 12px; color: var(--ink-3); }
</style>
