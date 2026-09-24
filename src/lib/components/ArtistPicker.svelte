<script lang="ts">
  // Direct descendant of the "We're changing how subscriptions work" mockup:
  // same tile grid, tick, dot meter, search + sort bar and sticky money footer.
  // Differences: no legacy plan to convert — each pick is one $2.49 artist
  // subscription, and the footer shows where the money goes.
  import Cover from './Cover.svelte';
  import { session } from '$lib/session.svelte';
  import { allSeries, creatorLine } from '$lib/data';
  import { money, quote, MAX_PICKS, PER_ARTIST_CENTS } from '$lib/pricing';
  import type { Series } from '$lib/types';

  let { initial = [], mode = 'new', busy = false, error = '', onconfirm, oncancel }: {
    initial?: string[]; mode?: 'new' | 'manage'; busy?: boolean; error?: string;
    onconfirm: (picks: string[]) => void; oncancel?: () => void;
  } = $props();

  // svelte-ignore state_referenced_locally
  let picked = $state<string[]>(initial.length ? [...initial] : session.follows.slice(0, 3));
  let filter = $state('');
  let sort = $state<'following' | 'popular' | 'az'>('following');
  let just = $state('');

  const series = allSeries();
  const q = $derived(quote(picked.length));
  const before = $derived(quote(initial.length));
  const match = (s: Series) => { const f = filter.trim().toLowerCase(); return !f || s.title.toLowerCase().includes(f) || creatorLine(s).toLowerCase().includes(f); };
  const sections = $derived.by(() => {
    const pool = series.filter(match);
    if (sort === 'following') {
      const fol = pool.filter((s) => session.follows.includes(s.slug));
      const rest = pool.filter((s) => !session.follows.includes(s.slug)).sort((a, b) => b.followers - a.followers);
      return [{ title: 'Artists you follow', list: fol }, { title: fol.length ? 'More on TinyCoup' : 'All artists', list: rest }].filter((x) => x.list.length);
    }
    const all = pool.slice().sort(sort === 'popular' ? (a, b) => b.followers - a.followers : (a, b) => a.title.localeCompare(b.title));
    return all.length ? [{ title: 'All artists', list: all }] : [];
  });

  function toggle(slug: string) {
    if (picked.includes(slug)) picked = picked.filter((x) => x !== slug);
    else if (picked.length < MAX_PICKS) { picked = [...picked, slug]; just = slug; setTimeout(() => (just = ''), 340); }
  }
  const changed = $derived(mode === 'new' || picked.length !== initial.length || picked.some((p) => !initial.includes(p)));
</script>

<div class="picker" role="group" aria-labelledby="pk-title">
  <div class="head">
    {#if oncancel}<button class="x" onclick={oncancel} title="Close" aria-label="Close">✕</button>{/if}
    <h1 id="pk-title">{mode === 'new' ? 'Pay the artists you actually read.' : 'Change who you back.'}</h1>
    <p class="sub">{mode === 'new' ? 'Your subscription is split into artist subscriptions — ' : 'Add or drop artists any time — '}<strong>{money(PER_ARTIST_CENTS)}</strong> each, per month.</p>

    <div class="convert">
      {#if mode === 'manage'}
        <div class="pill now"><div class="k">Now</div><div class="v">{initial.length} artist{initial.length === 1 ? '' : 's'}</div><div class="n">{money(before.monthlyCents)} / month</div></div>
        <div class="arrow">→</div>
      {:else}
        <div class="pill now"><div class="k">You pay</div><div class="v">{picked.length} × {money(PER_ARTIST_CENTS)}</div><div class="n">{money(q.monthlyCents)} / month, one charge</div></div>
        <div class="arrow">→</div>
      {/if}
      <div class="pill next">
        <div class="k">{mode === 'manage' ? 'After' : 'Artists get'}</div>
        <div class="v">{mode === 'manage' ? `${picked.length} artist${picked.length === 1 ? '' : 's'} · ${money(q.monthlyCents)}/mo` : `${money(q.creatorsCents)} / month`}</div>
        <div class="n">≈ {money(q.perArtistToCreatorCents)} to each artist · 85%</div>
      </div>
    </div>
    <div class="assure">
      <span><b>✓</b> Every premium comic unlocks, whoever you pick</span>
      <span><b>✓</b> Change artists any time (prorated)</span>
      <span><b>✓</b> Cancel in two clicks</span>
    </div>
  </div>

  <div class="bar">
    <div class="slots"><span>{picked.length} picked</span>
      <span class="dots" aria-hidden="true">{#each picked as p (p)}<span class="dot on" class:pop={just === p}></span>{/each}{#if !picked.length}<span class="dot"></span>{/if}</span>
    </div>
    <div class="grow"></div>
    <input class="mini" type="search" placeholder="Search artists…" aria-label="Search artists" bind:value={filter} />
    <select class="mini" aria-label="Sort artists" bind:value={sort}>
      <option value="following">Artists you follow first</option>
      <option value="popular">Most followed</option>
      <option value="az">A – Z</option>
    </select>
  </div>

  <div class="body">
    {#each sections as sec}
      <div class="sec-h"><h2>{sec.title}</h2></div>
      <div class="grid">
        {#each sec.list as s, i (s.slug)}
          {@const sel = picked.includes(s.slug)}
          <label class="tile" class:sel class:just={just === s.slug} style="--i:{Math.min(i, 26)}">
            <input type="checkbox" checked={sel} onchange={() => toggle(s.slug)} aria-label="Back {s.title}" />
            <div class="thumbwrap">
              <Cover series={s} size="100%" radius={0} />
              {#if session.follows.includes(s.slug) && sort !== 'following'}<span class="badge">FOLLOWING</span>{/if}
              <span class="tick"><svg viewBox="0 0 24 24"><path d="M4 12.5l5 5L20 6.5" stroke-linecap="round" stroke-linejoin="round" /></svg></span>
            </div>
            <div class="info"><div class="nm">{s.title}</div><div class="by">{creatorLine(s)}</div></div>
          </label>
        {/each}
      </div>
    {:else}
      <div class="sec-h"><h2>No artist matches “{filter}”.</h2></div>
    {/each}
  </div>

  <div class="foot">
    <div class="total">
      <div class="amt">{money(q.monthlyCents)} / month</div>
      <div class="note">
        {#if !picked.length}Pick at least one artist.
        {:else if mode === 'manage' && picked.length !== initial.length}
          {picked.length > initial.length ? '+' : '−'}{money(Math.abs(q.monthlyCents - before.monthlyCents))}/mo, prorated from today.
        {:else}{money(q.creatorsCents)} to {picked.length} artist{picked.length === 1 ? '' : 's'} · TinyCoup keeps 15% and pays card fees from it.{/if}
      </div>
      {#if error}<div class="error">{error}</div>{/if}
    </div>
    <div class="grow"></div>
    {#if oncancel}<button class="btn big desk-only" onclick={oncancel}>Not now</button>{/if}
    <button class="btn primary big" disabled={!picked.length || busy || !changed} onclick={() => onconfirm(picked)}>
      {busy ? 'Working…' : mode === 'new' ? `Back ${picked.length || ''} artist${picked.length === 1 ? '' : 's'}` : 'Save changes'}
    </button>
  </div>
</div>

<style>
  .picker { background: #fff; border-radius: 16px; box-shadow: var(--shadow); display: flex; flex-direction: column; overflow: hidden; max-height: calc(100vh - var(--bar) - 40px); }
  .head { padding: 20px 28px 15px; border-bottom: 1px solid var(--line); position: relative; }
  .head h1 { margin: 0; font-size: 24px; line-height: 1.2; letter-spacing: -0.015em; }
  .sub { margin: 7px 0 0; font-family: var(--serif); font-style: italic; font-size: 14.5px; color: var(--ink-3); }
  .x { position: absolute; top: 18px; right: 18px; width: 30px; height: 30px; border-radius: 999px; border: 1px solid var(--line); background: #fff; color: var(--ink-3); cursor: pointer; }
  .convert { display: flex; gap: 12px; margin-top: 14px; flex-wrap: wrap; }
  .pill { border: 1px solid var(--line); border-radius: 12px; padding: 9px 14px; min-width: 205px; }
  .pill .k { font-size: 11px; text-transform: uppercase; letter-spacing: 0.07em; color: var(--ink-4); font-weight: 700; }
  .pill .v { font-size: 15px; color: var(--ink-2); font-weight: 600; margin-top: 3px; }
  .pill .n { font-size: 12px; color: var(--ink-3); margin-top: 2px; }
  .pill.now { background: var(--cream); border-color: #f0e3bc; }
  .pill.next { background: var(--mint); border-color: #bee8d6; }
  .arrow { align-self: center; color: var(--line-strong); font-size: 20px; }
  .assure { display: flex; gap: 16px; flex-wrap: wrap; margin-top: 12px; }
  .assure span { font-size: 12.5px; color: var(--ink-3); }
  .assure b { color: var(--ok); }

  .bar { display: flex; align-items: center; gap: 12px; padding: 12px 28px; border-bottom: 1px solid var(--line); flex-wrap: wrap; }
  .slots { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; color: var(--ink-2); }
  .dots { display: flex; gap: 4px; flex-wrap: wrap; max-width: 260px; }
  .dot { width: 9px; height: 9px; border-radius: 99px; background: #e4e4e4; }
  .dot.on { background: var(--coup); }
  .dot.pop, .tile.just .tick { animation: pop 0.32s cubic-bezier(0.3, 1.5, 0.5, 1); }
  @keyframes pop { 0% { transform: scale(0.72); } 55% { transform: scale(1.2); } 100% { transform: scale(1); } }
  .mini { height: 32px; border: 1px solid transparent; border-radius: 9px; background: #f5f4f2; font-size: 12.5px; padding: 0 10px; }
  input.mini { width: 180px; }

  .body { overflow-y: auto; padding: 4px 28px 22px; min-height: 190px; scrollbar-width: thin; }
  .sec-h h2 { margin: 20px 0 11px; font-size: 14px; color: var(--ink-2); }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 9px; }
  .tile { position: relative; display: flex; flex-direction: column; border: 1px solid #efefef; border-radius: 10px; cursor: pointer; overflow: hidden; transition: 0.16s; animation: tileIn 0.3s cubic-bezier(0.2, 0.9, 0.3, 1) both; animation-delay: calc(var(--i) * 11ms); }
  @keyframes tileIn { from { opacity: 0; transform: translateY(7px) scale(0.98); } }
  .tile:hover { border-color: var(--line-strong); transform: translateY(-1px); box-shadow: 0 5px 13px rgba(0, 0, 0, 0.06); }
  .tile.sel { border-color: var(--coup); box-shadow: 0 0 0 2px var(--coup-ring); }
  .tile:focus-within { box-shadow: 0 0 0 3px var(--coup-ring); }
  .tile input { position: absolute; opacity: 0; width: 0; height: 0; }
  .thumbwrap { position: relative; aspect-ratio: 1; }
  .thumbwrap :global(img) { aspect-ratio: 1; }
  .tick { position: absolute; top: 6px; right: 6px; width: 18px; height: 18px; border-radius: 6px; background: rgba(255, 255, 255, 0.85); border: 1.5px solid rgba(23, 23, 23, 0.16); display: grid; place-items: center; }
  .tick svg { width: 11px; height: 11px; stroke: #fff; stroke-width: 3.2; fill: none; opacity: 0; }
  .tile.sel .tick { background: var(--coup); border-color: var(--coup); }
  .tile.sel .tick svg { opacity: 1; }
  .badge { position: absolute; top: 6px; left: 6px; background: rgba(255, 255, 255, 0.93); border-radius: 99px; font-size: 8.5px; font-weight: 700; color: var(--coup); padding: 2px 6px; }
  .info { padding: 7px 8px 8px; }
  .nm { font-size: 11.5px; font-weight: 600; color: var(--ink-2); line-height: 1.18; }
  .by { font-size: 10px; color: #8e8e8e; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 3px; }

  .foot { border-top: 1px solid var(--line); padding: 14px 28px; display: flex; align-items: center; gap: 12px; flex-wrap: wrap; box-shadow: 0 -5px 14px rgba(23, 23, 23, 0.04); }
  .amt { font-size: 18px; font-weight: 700; }
  .note { font-size: 12.5px; color: var(--ink-3); margin-top: 2px; max-width: 52ch; }

  @media (max-width: 899px) {
    .picker { border-radius: 0; box-shadow: none; max-height: none; overflow: visible; }
    .head { padding: 16px; } .head h1 { font-size: 20px; }
    .pill { min-width: 0; flex: 1 1 0; padding: 8px 10px; } .pill .v { font-size: 13px; } .arrow { display: none; }
    .bar { position: sticky; top: var(--bar); z-index: 4; background: #fff; padding: 9px 16px; gap: 8px; }
    .bar .grow { display: none; } input.mini { flex: 1 1 100%; order: 3; width: auto; } select.mini { margin-left: auto; }
    .body { padding: 0 14px 14px; overflow: visible; }
    .grid { grid-template-columns: repeat(auto-fill, minmax(clamp(64px, 22vw, 100px), 1fr)); gap: 7px; }
    .foot { position: sticky; bottom: calc(var(--bottom-nav) + env(safe-area-inset-bottom)); background: #fff; z-index: 4; flex-wrap: nowrap; padding: 10px 16px; }
    .amt { font-size: 15.5px; } .note { font-size: 11.5px; }
  }
  @media (prefers-reduced-motion: reduce) { .tile, .dot.pop, .tile.just .tick { animation: none; } }
</style>
