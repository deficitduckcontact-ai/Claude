<script lang="ts">
  // Old reddit's "MY SUBREDDITS" strip, for series.
  import { goto } from '$app/navigation';
  import { session } from '$lib/session.svelte';
  import { allEpisodes, allSeries } from '$lib/data';

  let open = $state(false);
  const series = $derived(allSeries());
  const mine = $derived(series.filter((s) => session.follows.includes(s.slug)));
  const strip = $derived(mine.length ? mine : series.slice().sort((a, b) => b.followers - a.followers));
  function random() {
    const eps = allEpisodes();
    const e = eps[Math.floor(Math.random() * eps.length)];
    if (e) goto(`/s/${e.slug}/${e.id}`);
  }
</script>

<svelte:window onclick={() => (open = false)} />

<nav class="sb desk-only" aria-label="Series">
  <div class="dd">
    <button onclick={(e) => { e.stopPropagation(); open = !open; }} aria-expanded={open}>my series ▾</button>
    {#if open}
      <div class="menu">
        {#each mine as s (s.slug)}<a href="/s/{s.slug}">{s.slug}</a>{:else}<span class="faint">follow a series and it shows up here</span>{/each}
        <a class="edit" href="/series">browse all series »</a>
      </div>
    {/if}
  </div>
  <span class="sep">|</span>
  <a href="/">front</a><span class="dash">-</span><a href="/series">all</a><span class="dash">-</span><button onclick={random}>random</button>
  <span class="sep">|</span>
  <div class="list">
    {#each strip as s, i (s.slug)}{#if i}<span class="dash">-</span>{/if}<a href="/s/{s.slug}">{s.slug}</a>{/each}
  </div>
  <a class="more" href="/series">more »</a>
</nav>

<style>
  .sb { height: 20px; background: #f0f0f0; border-bottom: 1px solid #e0e0e0; display: flex; align-items: center; gap: 4px; padding: 0 8px; font-family: var(--classic); font-size: 10px; text-transform: uppercase; color: #888; white-space: nowrap; position: relative; z-index: 31; }
  a, button { color: #555; text-decoration: none; background: none; border: 0; padding: 0; font: inherit; text-transform: inherit; cursor: pointer; }
  a:hover, button:hover { text-decoration: underline; color: #000; }
  .sep { color: #bbb; margin: 0 3px; }
  .dash { color: #bbb; margin: 0 4px; }
  .list { overflow: hidden; flex: 1; min-width: 0; text-overflow: ellipsis; }
  .more { font-weight: 700; margin-left: 6px; }
  .dd { position: relative; }
  .dd > button { font-weight: 700; }
  .menu { position: absolute; top: 16px; left: -8px; background: #fff; border: 1px solid #c4c4c4; box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15); display: flex; flex-direction: column; padding: 4px 0; min-width: 170px; text-transform: none; font-size: 12px; }
  .menu a, .menu span { padding: 3px 10px; }
  .menu a:hover { background: var(--brand-tint); text-decoration: none; }
  .edit { border-top: 1px solid #eee; margin-top: 3px; font-size: 11px; }
</style>
