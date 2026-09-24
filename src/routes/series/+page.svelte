<script lang="ts">
  import Cover from '$lib/components/Cover.svelte';
  import { session } from '$lib/session.svelte';
  import { allSeries, creatorLine, episodesOf } from '$lib/data';
  import { compact, ago } from '$lib/time';

  let tag = $state('all');
  let sort = $state<'popular' | 'updated' | 'az'>('popular');
  const series = $derived(allSeries());
  const tags = $derived(['all', ...new Set(series.flatMap((s) => s.tags))]);
  const latest = (slug: string) => episodesOf(slug)[0]?.publishedAt ?? 0;
  const list = $derived(
    series.filter((s) => tag === 'all' || s.tags.includes(tag))
      .sort(sort === 'popular' ? (a, b) => b.followers - a.followers : sort === 'updated' ? (a, b) => latest(b.slug) - latest(a.slug) : (a, b) => a.title.localeCompare(b.title))
  );
</script>

<svelte:head><title>All series — TinyCoup</title></svelte:head>

<div class="shell mid pad-m">
  <div class="top">
    <h1>All series</h1>
    <select class="input sel" bind:value={sort} aria-label="Sort">
      <option value="popular">Most followed</option><option value="updated">Recently updated</option><option value="az">A – Z</option>
    </select>
  </div>
  <div class="tags">{#each tags as t}<button class:on={tag === t} onclick={() => (tag = t)}>{t}</button>{/each}</div>

  <div class="grid">
    {#each list as s (s.slug)}
      {@const f = session.follows.includes(s.slug)}
      <div class="card item">
        <a href="/s/{s.slug}" class="cov"><Cover series={s} size="100%" radius={0} /></a>
        <div class="pad">
          <a href="/s/{s.slug}"><h3>{s.title}</h3></a>
          <div class="faint by">{creatorLine(s)}</div>
          <p class="muted">{s.tagline}</p>
          <div class="row foot">
            <span class="faint">{compact(s.followers + (f ? 1 : 0))} followers · {ago(latest(s.slug), session.now)}</span>
            <span class="grow"></span>
            <button class="btn small" class:soft={!f} onclick={() => session.toggleFollow(s.slug)}>{f ? 'Following' : '+ Follow'}</button>
          </div>
        </div>
      </div>
    {/each}
  </div>
</div>

<style>
  .top { display: flex; align-items: center; gap: 12px; }
  .top h1 { flex: 1; margin: 8px 0; }
  .sel { width: auto; height: 36px; }
  .tags { display: flex; gap: 6px; flex-wrap: wrap; margin: 6px 0 16px; }
  .tags button { border: 1px solid var(--line); background: #fff; border-radius: 99px; padding: 4px 12px; font-size: 13px; cursor: pointer; text-transform: capitalize; }
  .tags button.on { background: var(--coup); border-color: var(--coup); color: #fff; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 14px; }
  .item { overflow: hidden; display: flex; flex-direction: column; }
  .cov { display: block; aspect-ratio: 1; }
  .cov :global(img) { aspect-ratio: 1; }
  h3 { margin: 0; font-size: 16px; }
  .by { font-size: 12.5px; }
  p { font-size: 13.5px; margin: 6px 0 10px; }
  .foot { font-size: 12px; }
  @media (max-width: 520px) { .grid { grid-template-columns: 1fr 1fr; gap: 10px; } p { display: none; } }
</style>
