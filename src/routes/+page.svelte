<script lang="ts">
  import { browser } from '$app/environment';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { onMount, tick } from 'svelte';
  import FeedRow from '$lib/components/FeedRow.svelte';
  import LeftNav from '$lib/components/LeftNav.svelte';
  import RightRail from '$lib/components/RightRail.svelte';
  import Cover from '$lib/components/Cover.svelte';
  import { session } from '$lib/session.svelte';
  import { allEpisodes, allSeries, epKey, liveEpisodes, sortFeed } from '$lib/data';
  import type { Density, Episode, SortMode } from '$lib/types';

  const PER_PAGE = 25;
  const SORTS: { id: SortMode; label: string; d: string }[] = [
    { id: 'hot', label: 'Hot', d: 'M12 3s5 4.5 5 9.5a5 5 0 01-10 0C7 10 9 8.5 9 8.5s.5 3 2.5 3.5C11.5 8 12 3 12 3z' },
    { id: 'new', label: 'New', d: 'M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6' },
    { id: 'top', label: 'Top', d: 'M4 17l6-6 4 4 6-7M14 8h6v6' },
    { id: 'following', label: 'Following', d: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z' }
  ];
  const DENSITIES: { id: Density; label: string; d: string }[] = [
    { id: 'card', label: 'Card', d: 'M4 4h16v16H4z' },
    { id: 'compact', label: 'Compact', d: 'M4 5h5v5H4zM12 7h8M4 14h5v5H4zM12 16h8' },
    { id: 'classic', label: 'Classic', d: 'M4 6h16M4 12h16M4 18h16' }
  ];

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
  const density = $derived<Density>(browser ? session.density : 'card');

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


<div class="shell wide">
  <div class="three">
    <LeftNav />
    <section aria-label="Comics feed">
      <div class="sortbar">
        <div class="sorts" role="tablist">
          {#each SORTS as so}
            <button role="tab" aria-selected={sort === so.id} class:on={sort === so.id} onclick={() => setSort(so.id)}>
              <svg viewBox="0 0 24 24"><path d={so.d} /></svg>{so.label}
            </button>
          {/each}
        </div>
        <div class="views desk-only" role="radiogroup" aria-label="Layout">
          {#each DENSITIES as d}
            <button role="radio" aria-checked={density === d.id} class:on={density === d.id} onclick={() => setDensity(d.id)} title={d.label}><svg viewBox="0 0 24 24"><path d={d.d} /></svg></button>
          {/each}
          <button onclick={() => (help = !help)} title="Keyboard shortcuts (?)"><svg viewBox="0 0 24 24"><path d="M3 7h18v10H3zM7 11h.01M11 11h.01M15 11h.01M8 14h8" /></svg></button>
        </div>
      </div>

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
          {#if pageNo}<button onclick={() => go(pageNo - 1)}>← Previous</button>{/if}
          <span>Page {pageNo + 1} of {Math.ceil(feed.length / PER_PAGE)}</span>
          {#if pageNo && (pageNo + 1) * PER_PAGE < feed.length}<span class="sep">|</span>{/if}
          {#if (pageNo + 1) * PER_PAGE < feed.length}<button onclick={() => go(pageNo + 1)}>Next page →</button>{/if}
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
  .sortbar { display: flex; align-items: center; gap: 8px; margin-bottom: 14px; padding: 6px; background: var(--surface); border: 1px solid var(--line); border-radius: 14px; box-shadow: var(--shadow-sm); }
  .sorts { display: flex; gap: 4px; flex: 1; overflow-x: auto; scrollbar-width: none; }
  .sorts button, .views button { display: inline-flex; align-items: center; gap: 6px; border: 0; background: none; height: 34px; padding: 0 14px; border-radius: 999px; font-size: 14px; font-weight: 600; color: var(--ink-3); cursor: pointer; white-space: nowrap; }
  .sorts button:hover, .views button:hover { background: var(--surface-3); }
  .sorts button.on { background: var(--brand-tint); color: var(--brand); }
  .views { display: flex; gap: 2px; border-left: 1px solid var(--line); padding-left: 6px; }
  .views button { padding: 0 9px; }
  .views button.on { background: var(--surface-3); color: var(--ink); }
  svg { width: 17px; height: 17px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
  .help { background: var(--surface); border: 1px solid var(--line); border-radius: 12px; padding: 10px 14px; margin-bottom: 12px; font-size: 13px; }
  kbd { background: var(--surface-3); border: 1px solid var(--line); border-radius: 4px; padding: 0 5px; }
  .empty { text-align: center; background: var(--surface); border: 1px solid var(--line); border-radius: 16px; padding: 22px; margin-bottom: 14px; }
  .empty h3 { margin: 0 0 4px; }
  .sitetable.classic { background: var(--surface); border: 1px solid var(--line); border-radius: 14px; overflow: hidden; box-shadow: var(--shadow-sm); }
  .nav { margin: 8px 0 16px; display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 13px; color: var(--ink-4); }
  .nav button { background: var(--surface); border: 1px solid var(--line-strong); border-radius: 999px; padding: 7px 16px; font: inherit; font-weight: 600; color: var(--ink-2); cursor: pointer; }
  .nav button:hover { border-color: var(--brand); color: var(--brand); }
  .sep { display: none; }
  .end { text-align: center; font-size: 13px; }
  .strip { gap: 12px; overflow-x: auto; padding: 12px 14px; background: var(--surface); border-bottom: 1px solid var(--line); scrollbar-width: none; }
  .strip a { display: flex; flex-direction: column; align-items: center; gap: 4px; width: 62px; font-size: 10.5px; text-align: center; color: var(--ink-2); text-decoration: none; }
  .strip span { width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  @media (max-width: 899px) {
    .strip.mob-only { display: flex; }
    .sortbar { position: sticky; top: var(--bar); z-index: 5; border-radius: 0; border-width: 0 0 1px; margin: 0; box-shadow: none; padding: 6px 8px; }
    .sorts button { flex: 1; justify-content: center; padding: 0 8px; }
    .sorts button svg { display: none; }
    .sitetable.classic { border-radius: 0; border-left: 0; border-right: 0; }
    .empty { margin: 10px; }
  }
</style>
