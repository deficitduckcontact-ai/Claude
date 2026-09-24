<script lang="ts">
  import { browser } from '$app/environment';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { onMount, tick } from 'svelte';
  import FeedRow from '$lib/components/FeedRow.svelte';
  import LeftRail from '$lib/components/LeftRail.svelte';
  import RightRail from '$lib/components/RightRail.svelte';
  import Cover from '$lib/components/Cover.svelte';
  import { session } from '$lib/session.svelte';
  import { allEpisodes, allSeries, epKey, liveEpisodes, sortFeed } from '$lib/data';
  import type { Density, Episode, SortMode } from '$lib/types';

  const SORTS: { id: SortMode; label: string }[] = [
    { id: 'hot', label: '🔥 Hot' }, { id: 'new', label: '✦ New' }, { id: 'top', label: '▲ Top' }, { id: 'following', label: '★ Following' }
  ];
  const DENSITIES: { id: Density; label: string }[] = [{ id: 'card', label: 'Card' }, { id: 'compact', label: 'Compact' }, { id: 'classic', label: 'Classic' }];

  let live = $state<Episode[]>([]);
  let shown = $state(25);
  let sel = $state(-1);
  let open = $state<string[]>([]);
  let help = $state(false);

  const urlSort = $derived(browser ? (page.url.searchParams.get('sort') as SortMode | null) : null);
  const sort = $derived<SortMode>(urlSort ?? session.sort);
  const merged = $derived.by(() => {
    const seen = new Set(live.map(epKey));
    return [...live, ...allEpisodes().filter((e) => !seen.has(epKey(e)))];
  });
  const feed = $derived(sortFeed(merged, sort, session.now, session.follows));
  const visible = $derived(feed.slice(0, shown));
  const followed = $derived(allSeries().filter((s) => session.follows.includes(s.slug)));

  onMount(async () => { live = await liveEpisodes().catch(() => []); });

  function setSort(s: SortMode) { session.sort = s; session.save(); goto(s === 'hot' ? '/' : `/?sort=${s}`, { replaceState: true, noScroll: true, keepFocus: true }); sel = -1; }
  function setDensity(d: Density) { session.density = d; session.save(); }
  function toggle(k: string) { open = open.includes(k) ? open.filter((x) => x !== k) : [...open, k]; }

  async function move(d: number) {
    sel = Math.max(0, Math.min(visible.length - 1, sel + d));
    await tick();
    document.querySelector(`[data-key="${epKey(visible[sel])}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
  // old-reddit / RES style keyboard nav
  function onkey(e: KeyboardEvent) {
    if (e.metaKey || e.ctrlKey || e.altKey || /input|textarea|select/i.test((e.target as HTMLElement).tagName)) return;
    const ep = visible[sel];
    switch (e.key) {
      case 'j': move(1); break;
      case 'k': move(-1); break;
      case 'x': case ' ': if (ep) { e.preventDefault(); toggle(epKey(ep)); session.markRead(epKey(ep)); } break;
      case 'o': case 'Enter': if (ep) goto(`/s/${ep.slug}/${ep.id}`); break;
      case 'l': if (ep && session.account) session.toggleLike(epKey(ep)); break;
      case 'f': if (ep && session.account) session.toggleFollow(ep.slug); break;
      case '?': help = !help; break;
      case 'Escape': help = false; break;
    }
  }
</script>

<svelte:window onkeydown={onkey} />
<svelte:head><link rel="canonical" href="/" /></svelte:head>

<div class="shell">
  <div class="three">
    <LeftRail />

    <section aria-label="Comics feed">
      {#if followed.length}
        <div class="strip mob-only" aria-label="Your series">
          {#each followed as s (s.slug)}<a href="/s/{s.slug}"><Cover series={s} size={56} radius={99} /><span>{s.title}</span></a>{/each}
        </div>
      {/if}

      <div class="toolbar">
        <div class="tabs" role="tablist">
          {#each SORTS as s}
            <button role="tab" aria-selected={sort === s.id} class:on={sort === s.id} onclick={() => setSort(s.id)}>{s.label}</button>
          {/each}
        </div>
        <div class="grow"></div>
        <div class="dens desk-only" role="radiogroup" aria-label="Density">
          {#each DENSITIES as d}
            <button role="radio" aria-checked={session.density === d.id} class:on={session.density === d.id} onclick={() => setDensity(d.id)}>{d.label}</button>
          {/each}
        </div>
        <button class="kbd desk-only" onclick={() => (help = !help)} title="Keyboard shortcuts">⌨</button>
      </div>

      {#if help}
        <div class="card pad help">
          <b>Keyboard</b>: <kbd>j</kbd>/<kbd>k</kbd> next/prev · <kbd>x</kbd> expand · <kbd>o</kbd> open · <kbd>l</kbd> like · <kbd>f</kbd> follow · <kbd>?</kbd> this help
        </div>
      {/if}

      {#if sort === 'following' && !session.follows.length}
        <div class="card pad empty">
          <h3>You're not following anyone yet.</h3>
          <p class="muted">Follow a series and its new episodes land here, in order.</p>
          <a class="btn primary" href="/series">Browse series</a>
        </div>
      {/if}

      {#each visible as ep, i (epKey(ep))}
        <FeedRow {ep} rank={i + 1} density={browser ? session.density : 'compact'} selected={sel === i}
          expanded={open.includes(epKey(ep))} ontoggle={() => toggle(epKey(ep))} onselect={() => (sel = i)} />
      {/each}

      {#if shown < feed.length}
        <button class="btn block more" onclick={() => (shown += 25)}>Load more</button>
      {:else if feed.length}
        <p class="faint end">You're all caught up.</p>
      {/if}
      <!-- TODO(live): cursor pagination (startAfter) instead of client slice once the archive grows. -->
    </section>

    <RightRail />
  </div>
</div>

<style>
  .toolbar { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; flex-wrap: wrap; }
  .tabs, .dens { display: flex; gap: 2px; background: #fff; border: 1px solid var(--line); border-radius: 10px; padding: 3px; }
  .tabs button, .dens button { border: 0; background: none; padding: 6px 11px; border-radius: 7px; font-size: 13.5px; font-weight: 600; color: var(--ink-3); cursor: pointer; }
  .tabs button.on { background: var(--coup-tint); color: var(--coup-dark); }
  .dens button { font-size: 12px; padding: 5px 9px; }
  .dens button.on { background: #f1efe9; color: var(--ink); }
  .kbd { border: 1px solid var(--line); background: #fff; border-radius: 8px; width: 34px; height: 34px; cursor: pointer; color: var(--ink-3); }
  .help { margin-bottom: 10px; font-size: 13px; }
  kbd { background: #f1efe9; border: 1px solid var(--line); border-radius: 4px; padding: 0 5px; font-size: 12px; }
  .empty { text-align: center; margin-bottom: 10px; }
  .more { margin-top: 6px; }
  .end { text-align: center; font-size: 13px; }
  .strip { display: flex; gap: 12px; overflow-x: auto; padding: 12px 14px; background: #fff; border-bottom: 1px solid var(--line); scrollbar-width: none; }
  .strip a { display: flex; flex-direction: column; align-items: center; gap: 4px; width: 62px; font-size: 10.5px; text-align: center; color: var(--ink-2); text-decoration: none; }
  .strip span { width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  @media (max-width: 899px) {
    .toolbar { position: sticky; top: var(--bar); z-index: 5; background: var(--page); padding: 8px 10px; margin: 0; }
    .toolbar .grow { display: none; }
    .tabs { flex: 1; min-width: 0; overflow-x: auto; scrollbar-width: none; } .tabs button { flex: 1; white-space: nowrap; padding: 6px 6px; font-size: 13px; }
    .empty { margin: 10px; }
  }
</style>
