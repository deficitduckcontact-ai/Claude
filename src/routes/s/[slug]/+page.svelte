<script lang="ts">
  import { browser } from '$app/environment';
  import { page } from '$app/state';
  import Cover from '$lib/components/Cover.svelte';
  import FeedRow from '$lib/components/FeedRow.svelte';
  import RightRail from '$lib/components/RightRail.svelte';
  import { session } from '$lib/session.svelte';
  import { creatorsOf, episodesOf, epKey, getSeries } from '$lib/data';
  import { money, PER_ARTIST_CENTS } from '$lib/pricing';
  import { compact } from '$lib/time';

  // A series page works like a new-reddit community: banner + header, episodes feed, About card.
  const s = $derived(getSeries(page.params.slug!));
  let sort = $state<'new' | 'top' | 'first'>('new');
  let open = $state<string[]>([]);
  const all = $derived(s ? episodesOf(s.slug) : []);
  const eps = $derived(sort === 'top' ? all.slice().sort((a, b) => b.likes - a.likes) : sort === 'first' ? all.slice().reverse() : all);
  const following = $derived(!!s && session.follows.includes(s.slug));
  const backed = $derived(!!s && session.sub.picks.includes(s.slug));
  const density = $derived(browser ? session.density : 'card');
  const likes = $derived(all.reduce((n, e) => n + e.likes, 0));
  const toggle = (k: string) => (open = open.includes(k) ? open.filter((x) => x !== k) : [...open, k]);
</script>

<svelte:head>
  {#if s}
    <title>{s.title} — TinyCoup</title>
    <meta name="description" content={s.tagline} />
    <meta property="og:title" content={s.title} />
    <meta property="og:description" content={s.tagline} />
  {/if}
</svelte:head>

{#if !s}
  <div class="shell narrow pad-m" style="text-align:center;padding-top:60px">
    {#if session.ready}<h1>No series called “{page.params.slug}”.</h1><a class="btn primary" href="/series">All series</a>{:else}<p class="faint">Loading…</p>{/if}
  </div>
{:else}
  <div class="banner" style="--h:{s.hue}"></div>
  <div class="hdr-wrap">
    <header class="hdr">
      <div class="av"><Cover series={s} size={96} radius={99} /></div>
      <div class="id">
        <h1>{s.title}</h1>
        <div class="muted">by {#each creatorsOf(s) as c, i}{i ? ' & ' : ''}<a href="/u/{c.handle}">{c.name}</a>{/each} · s/{s.slug}</div>
      </div>
      <div class="acts">
        <button class="btn" class:primary={!following} onclick={() => session.toggleFollow(s.slug)}>{following ? '✓ Following' : 'Follow'}</button>
        {#if backed}<a class="btn soft" href="/me/plan">♥ Backing</a>
        {:else}<a class="btn back" href="/subscribe?add={s.slug}">♥ Back · {money(PER_ARTIST_CENTS)}/mo</a>{/if}
      </div>
    </header>
    <div class="stats">
      <div><b>{compact(s.followers + (following ? 1 : 0))}</b><span>Followers</span></div>
      <div><b>{all.length}</b><span>Episodes</span></div>
      <div><b>{compact(likes)}</b><span>Likes</span></div>
      <div><b>{s.schedule}</b><span>Schedule</span></div>
    </div>
    <div class="tabs" role="tablist">
      <button role="tab" aria-selected={sort === 'new'} class:on={sort === 'new'} onclick={() => (sort = 'new')}>Newest</button>
      <button role="tab" aria-selected={sort === 'top'} class:on={sort === 'top'} onclick={() => (sort = 'top')}>Top</button>
      <button role="tab" aria-selected={sort === 'first'} class:on={sort === 'first'} onclick={() => (sort = 'first')}>From the start</button>
    </div>
  </div>

  <div class="shell wide">
    <div class="two">
      <section>
        {#if !eps.length}<p class="muted" style="padding:14px">No episodes yet.</p>{/if}
        <div class="sitetable {density}">
          {#each eps as ep, i (ep.id)}
            <FeedRow {ep} rank={i + 1} {density} showSeries={false} expanded={open.includes(epKey(ep))} ontoggle={() => toggle(epKey(ep))} onselect={() => {}} />
          {/each}
        </div>
      </section>

      <div class="rail">
        <RightRail>
          {#snippet top()}
            <div class="card about">
              <div class="pad">
                <div class="k">About</div>
                <p class="tag">{s.tagline}</p>
                <p>{s.about}</p>
                <div class="tags">{#each s.tags as t}<span class="chip brand">{t}</span>{/each}</div>
                <div class="kv"><span class="k">Creator{creatorsOf(s).length === 1 ? '' : 's'}</span>
                  {#each creatorsOf(s) as c}<a class="cr" href="/u/{c.handle}"><b>{c.name}</b><small>{c.bio}</small></a>{/each}</div>
              </div>
            </div>
          {/snippet}
        </RightRail>
      </div>
    </div>
  </div>
{/if}

<style>
  .banner { height: 128px; background: linear-gradient(120deg, hsl(var(--h) 65% 78%), hsl(calc(var(--h) + 50) 60% 86%)); }
  .hdr-wrap { background: var(--surface); border-bottom: 1px solid var(--line); }
  .hdr { max-width: 1080px; margin: 0 auto; padding: 0 20px; display: flex; align-items: flex-end; gap: 16px; }
  .av { margin-top: -40px; border: 4px solid var(--surface); border-radius: 99px; display: flex; background: var(--surface); }
  .id { flex: 1; min-width: 0; padding-bottom: 6px; }
  h1 { margin: 0; font-size: 28px; letter-spacing: -0.02em; }
  .id a { color: var(--ink-2); font-weight: 600; }
  .acts { display: flex; gap: 8px; padding-bottom: 8px; flex-wrap: wrap; }
  .back { background: var(--heart-bg); border-color: var(--heart-line); color: var(--heart); font-weight: 600; }
  .stats { max-width: 1080px; margin: 12px auto 0; padding: 0 20px; display: flex; gap: 28px; }
  .stats div { display: flex; flex-direction: column; }
  .stats b { font-size: 15px; color: var(--ink); }
  .stats span { font-size: 12px; color: var(--ink-4); }
  .tabs { max-width: 1080px; margin: 8px auto 0; padding: 0 16px; display: flex; gap: 4px; }
  .tabs button { border: 0; background: none; padding: 12px 14px; font-size: 14px; font-weight: 600; color: var(--ink-3); cursor: pointer; border-bottom: 3px solid transparent; }
  .tabs button.on { color: var(--ink); border-bottom-color: var(--brand); }
  .tabs button:hover { color: var(--ink); }
  .sitetable.classic { background: var(--surface); border: 1px solid var(--line); border-radius: 14px; overflow: hidden; }
  .about p { margin: 6px 0 10px; font-size: 14px; color: var(--ink-2); line-height: 1.55; }
  .about .tag { font-family: var(--serif); font-style: italic; color: var(--ink-3); font-size: 15px; }
  .tags { display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 14px; }
  .kv { border-top: 1px solid var(--line); padding-top: 12px; display: flex; flex-direction: column; gap: 6px; }
  .cr { display: flex; flex-direction: column; font-size: 14px; } .cr b { color: var(--ink); } .cr small { color: var(--ink-3); }
  @media (max-width: 899px) {
    .banner { height: 88px; }
    .hdr { flex-wrap: wrap; padding: 0 14px; gap: 10px; }
    .av { margin-top: -34px; }
    .av :global(img) { width: 72px !important; height: 72px !important; }
    .acts { width: 100%; }
    .acts > :global(*) { flex: 1; }
    h1 { font-size: 22px; }
    .stats { padding: 0 14px; gap: 18px; flex-wrap: wrap; }
    .tabs { padding: 0 6px; }
    .sitetable.classic { border-radius: 0; }
  }
</style>
