<script lang="ts">
  import { browser } from '$app/environment';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { onMount, tick } from 'svelte';
  import FeedRow from '$lib/components/FeedRow.svelte';
  import HeaderTabs from '$lib/components/HeaderTabs.svelte';
  import RightRail from '$lib/components/RightRail.svelte';
  import Cover from '$lib/components/Cover.svelte';
  import { session } from '$lib/session.svelte';
  import { allEpisodes, allSeries, epKey, liveEpisodes, sortFeed } from '$lib/data';
  import type { Density, Episode, SortMode } from '$lib/types';

  const PER_PAGE = 25;
  const SORTS: { id: SortMode; label: string }[] = [{ id: 'hot', label: 'hot' }, { id: 'new', label: 'new' }, { id: 'top', label: 'top' }, { id: 'following', label: 'following' }];
  const DENSITIES: { id: Density; label: string }[] = [{ id: 'classic', label: 'Classic' }, { id: 'compact', label: 'Compact' }, { id: 'card', label: 'Card' }];

  let live = $state<Episode[]>([]);
  let pageNo = $state(0);
  let sel = $state(-1);
  let open = $state<string[]>([]);
  let help = $state(false);

  const urlSort = $derived(browser ? (page.url.searchParams.get('sort') as SortMode | null) : null);
  const sort = $derived<SortMode>(urlSort ?? session.sort);
  const merged = $derived.by(() => {
    const seen = new Set(live.map(epKey));
    return [...live, ...allEpisodes().filter((e) => !seen.has(epKey(e)))];
  });
  const feed = $derived(sortFeed(merged, sort, session.now, session.follows).filter((e) => !session.hidden.includes(epKey(e))));
  const visible = $derived(feed.slice(pageNo * PER_PAGE, (pageNo + 1) * PER_PAGE));
  const followed = $derived(allSeries().filter((s) => session.follows.includes(s.slug)));
  const density = $derived<Density>(browser ? session.density : 'classic');

  onMount(async () => { live = await liveEpisodes().catch(() => []); });

  function setSort(s: SortMode) {
    session.sort = s; session.save(); pageNo = 0; sel = -1;
    goto(s === 'hot' ? '/' : `/?sort=${s}`, { replaceState: true, noScroll: true, keepFocus: true });
  }
  function setDensity(d: Density) { session.density = d; session.save(); }
  function toggle(k: string) { open = open.includes(k) ? open.filter((x) => x !== k) : [...open, k]; }
  function go(p: number) { pageNo = p; sel = -1; scrollTo({ top: 0 }); }

  async function move(d: number) {
    sel = Math.max(0, Math.min(visible.length - 1, sel + d));
    await tick();
    document.querySelector(`[data-key="${epKey(visible[sel])}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
  // old-reddit + RES keyboard nav. (No space bar: people use it to scroll.)
  function onkey(e: KeyboardEvent) {
    if (e.metaKey || e.ctrlKey || e.altKey || /input|textarea|select/i.test((e.target as HTMLElement).tagName)) return;
    const ep = visible[sel];
    switch (e.key) {
      case 'j': move(1); break;
      case 'k': move(-1); break;
      case 'x': if (ep) { toggle(epKey(ep)); session.markRead(epKey(ep)); } break;
      case 'o': case 'Enter': if (ep && sel >= 0) goto(`/s/${ep.slug}/${ep.id}`); break;
      case 'l': if (ep && session.account) session.toggleLike(epKey(ep)); break;
      case 's': if (ep && session.account) session.toggleSave(epKey(ep)); break;
      case 'h': if (ep && session.account) session.toggleHide(epKey(ep)); break;
      case 'f': if (ep && session.account) session.toggleFollow(ep.slug); break;
      case 'n': if ((pageNo + 1) * PER_PAGE < feed.length) go(pageNo + 1); break;
      case 'p': if (pageNo) go(pageNo - 1); break;
      case '?': help = !help; break;
      case 'Escape': help = false; break;
    }
  }
</script>

<svelte:window onkeydown={onkey} />
<svelte:head><link rel="canonical" href="/" /></svelte:head>

<HeaderTabs title="front page" tabs={SORTS.map((s) => ({ label: s.label, on: sort === s.id, onclick: () => setSort(s.id) }))}>
  {#snippet right()}
    <div class="right desk-only">
      <span class="lbl">view:</span>
      {#each DENSITIES as d}
        <button class:on={density === d.id} aria-pressed={density === d.id} onclick={() => setDensity(d.id)}>{d.label}</button>
      {/each}
      <button onclick={() => (help = !help)} title="Keyboard shortcuts">⌨</button>
    </div>
  {/snippet}
</HeaderTabs>

<div class="shell wide">
  <div class="two">
    <section aria-label="Comics feed">
      {#if followed.length}
        <div class="strip mob-only" aria-label="Your series">
          {#each followed as s (s.slug)}<a href="/s/{s.slug}"><Cover series={s} size={56} radius={99} /><span>{s.title}</span></a>{/each}
        </div>
      {/if}

      {#if help}
        <div class="help">
          <b>keyboard</b>: <kbd>j</kbd>/<kbd>k</kbd> next/prev · <kbd>x</kbd> expand · <kbd>o</kbd> open · <kbd>l</kbd> like · <kbd>s</kbd> save · <kbd>h</kbd> hide · <kbd>f</kbd> follow · <kbd>n</kbd>/<kbd>p</kbd> page · <kbd>?</kbd> this
        </div>
      {/if}

      {#if sort === 'following' && !session.follows.length}
        <div class="empty">
          <h3>You're not following anyone yet.</h3>
          <p class="muted">Follow a series and its new episodes land here, in order.</p>
          <a class="btn primary" href="/series">Browse series</a>
        </div>
      {/if}

      <div class="sitetable {density}">
        {#each visible as ep, i (epKey(ep))}
          <FeedRow {ep} rank={pageNo * PER_PAGE + i + 1} {density} selected={sel === i}
            expanded={open.includes(epKey(ep))} ontoggle={() => toggle(epKey(ep))} onselect={() => (sel = i)} />
        {/each}
      </div>

      {#if feed.length > PER_PAGE}
        <div class="nav">
          view more:
          {#if pageNo}<button onclick={() => go(pageNo - 1)}>‹ prev</button>{/if}
          {#if pageNo && (pageNo + 1) * PER_PAGE < feed.length}<span class="sep">|</span>{/if}
          {#if (pageNo + 1) * PER_PAGE < feed.length}<button onclick={() => go(pageNo + 1)}>next ›</button>{/if}
        </div>
      {:else if feed.length}
        <p class="faint end">You're all caught up.</p>
      {/if}
      <!-- TODO(live): cursor pagination (startAfter) once the archive outgrows one query. -->
    </section>

    <div class="rail"><RightRail /></div>
  </div>
</div>

<style>
  .right { display: flex; align-items: center; gap: 2px; padding-bottom: 5px; font-family: var(--classic); font-size: 11px; }
  .lbl { color: var(--ink-4); margin-right: 3px; }
  .right button { border: 1px solid transparent; background: none; padding: 2px 7px; border-radius: 3px; font: inherit; color: var(--link); cursor: pointer; }
  .right button.on { background: #fff; border-color: var(--header-line); color: var(--ink); font-weight: 700; }
  .help { background: #fff; border: 1px solid var(--line); border-radius: 6px; padding: 8px 12px; margin-bottom: 10px; font-size: 12.5px; font-family: var(--classic); }
  kbd { background: var(--page); border: 1px solid var(--line); border-radius: 3px; padding: 0 5px; }
  .empty { text-align: center; background: #fff; border: 1px solid var(--line); border-radius: 8px; padding: 18px; margin-bottom: 10px; }
  .empty h3 { margin: 0 0 4px; }
  .sitetable.classic { background: #fff; border: 1px solid var(--line); border-radius: 6px; padding: 4px 0; box-shadow: var(--shadow-sm); }
  .nav { margin: 12px 0; font-family: var(--classic); font-size: 12px; color: var(--ink-4); display: flex; align-items: center; gap: 6px; }
  .nav button { background: #eef4fb; border: 1px solid #c6d4e8; border-radius: 3px; padding: 2px 8px; font: inherit; font-weight: 700; color: var(--link); cursor: pointer; }
  .nav button:hover { border-color: var(--brand); }
  .sep { color: #ccc; }
  .end { text-align: center; font-size: 13px; }
  .strip { display: flex; gap: 12px; overflow-x: auto; padding: 12px 14px; background: #fff; border-bottom: 1px solid var(--line); scrollbar-width: none; }
  .strip a { display: flex; flex-direction: column; align-items: center; gap: 4px; width: 62px; font-size: 10.5px; text-align: center; color: var(--ink-2); text-decoration: none; }
  .strip span { width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  @media (max-width: 899px) {
    .sitetable.classic { border-radius: 0; border-left: 0; border-right: 0; }
    .empty { margin: 10px; }
    .nav { padding: 0 14px; }
  }
</style>
