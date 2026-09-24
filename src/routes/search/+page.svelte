<script lang="ts">
  import { onMount } from 'svelte';
  import Cover from '$lib/components/Cover.svelte';
  import { session } from '$lib/session.svelte';
  import { allEpisodes, allSeries, creatorLine, getSeries } from '$lib/data';
  import { CREATORS } from '$lib/seed';
  import { ago } from '$lib/time';

  let q = $state('');
  onMount(() => { q = new URLSearchParams(location.search).get('q') ?? ''; });
  $effect(() => { const u = new URL(location.href); if (q) u.searchParams.set('q', q); else u.searchParams.delete('q'); history.replaceState(history.state, '', u); });
  // TODO(live): client-side filtering is fine for ~10k episodes; beyond that add Algolia/Typesense via the Firebase extension.
  const needle = $derived(q.trim().toLowerCase());
  const series = $derived(needle ? allSeries().filter((s) => (s.title + s.tagline + s.tags.join(' ') + creatorLine(s)).toLowerCase().includes(needle)) : []);
  const eps = $derived(needle ? allEpisodes().filter((e) => (e.title + ' ' + (e.caption ?? '')).toLowerCase().includes(needle)).slice(0, 30) : []);
  const people = $derived(needle ? CREATORS.filter((c) => (c.name + c.handle).toLowerCase().includes(needle)) : []);
</script>

<svelte:head><title>Search — TinyCoup</title></svelte:head>

<div class="shell narrow pad-m">
  <!-- svelte-ignore a11y_autofocus -->
  <input class="input big" type="search" placeholder="Search series, comics or creators" bind:value={q} autofocus />
  {#if needle}
    {#if series.length}<h3>Series</h3>{#each series as s (s.slug)}<a class="card r" href="/s/{s.slug}"><Cover series={s} size={44} radius={8} /><span><b>{s.title}</b><small class="faint">{creatorLine(s)} · {s.tagline}</small></span></a>{/each}{/if}
    {#if people.length}<h3>Creators</h3>{#each people as c (c.uid)}<a class="card r" href="/u/{c.handle}"><span><b>{c.name}</b><small class="faint">@{c.handle}</small></span></a>{/each}{/if}
    {#if eps.length}<h3>Episodes</h3>{#each eps as e (e.slug + e.id)}{@const s = getSeries(e.slug)}{#if s}<a class="card r" href="/s/{e.slug}/{e.id}"><Cover series={s} size={44} radius={8} /><span><b>{e.title}</b><small class="faint">{s.title} #{e.number} · {ago(e.publishedAt, session.now)}</small></span></a>{/if}{/each}{/if}
    {#if !series.length && !eps.length && !people.length}<p class="muted">Nothing matches “{q}”.</p>{/if}
  {:else}
    <p class="muted">Try “science”, “cats” or a creator's name.</p>
  {/if}
</div>

<style>
  .big { height: 48px; font-size: 16px; margin: 8px 0 12px; }
  h3 { font-size: 12px; text-transform: uppercase; letter-spacing: 0.07em; color: var(--ink-4); margin: 18px 0 8px; }
  .r { display: flex; gap: 12px; align-items: center; padding: 10px; margin-bottom: 6px; text-decoration: none; }
  .r span { display: flex; flex-direction: column; font-size: 14px; min-width: 0; }
  .r small { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
</style>
