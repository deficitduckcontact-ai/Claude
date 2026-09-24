<script lang="ts">
  import { browser } from '$app/environment';
  import { page } from '$app/state';
  import Cover from '$lib/components/Cover.svelte';
  import FeedRow from '$lib/components/FeedRow.svelte';
  import HeaderTabs from '$lib/components/HeaderTabs.svelte';
  import RightRail from '$lib/components/RightRail.svelte';
  import { session } from '$lib/session.svelte';
  import { creatorsOf, episodesOf, epKey, getSeries } from '$lib/data';
  import { money, PER_ARTIST_CENTS } from '$lib/pricing';
  import { compact } from '$lib/time';

  // A series page works like a subreddit: its own header band, episodes as a feed, info in the sidebar.
  const s = $derived(getSeries(page.params.slug!));
  let sort = $state<'new' | 'top' | 'first'>('new');
  let open = $state<string[]>([]);
  const eps = $derived.by(() => {
    const list = s ? episodesOf(s.slug) : [];
    return sort === 'top' ? list.slice().sort((a, b) => b.likes - a.likes) : sort === 'first' ? list.slice().reverse() : list;
  });
  const following = $derived(!!s && session.follows.includes(s.slug));
  const backed = $derived(!!s && session.sub.picks.includes(s.slug));
  const density = $derived(browser ? session.density : 'classic');
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
  <HeaderTabs title={s.title} tabs={[
    { label: 'new', on: sort === 'new', onclick: () => (sort = 'new') },
    { label: 'top', on: sort === 'top', onclick: () => (sort = 'top') },
    { label: 'from the start', on: sort === 'first', onclick: () => (sort = 'first') }
  ]}>
    {#snippet icon()}<Cover series={s} size={30} radius={99} />{/snippet}
  </HeaderTabs>

  <div class="shell wide">
    <div class="two">
      <section>
        <!-- phone: the sidebar info goes on top -->
        <div class="mob-only mhead">
          <Cover series={s} size={64} radius={14} />
          <div class="grow"><h1>{s.title}</h1><div class="faint">{compact(s.followers + (following ? 1 : 0))} followers · {s.schedule}</div></div>
          <button class="btn" class:primary={!following} onclick={() => session.toggleFollow(s.slug)}>{following ? 'Following' : 'Follow'}</button>
        </div>
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
            <div class="about">
              <h2>{s.title}</h2>
              <div class="row">
                <button class="btn small" class:primary={!following} onclick={() => session.toggleFollow(s.slug)}>{following ? '✓ following' : '+ follow'}</button>
                <span class="faint"><b>{compact(s.followers + (following ? 1 : 0))}</b> followers</span>
              </div>
              {#if backed}<a class="btn soft block" href="/me/plan">♥ You back this artist</a>
              {:else}<a class="btn primary block" href="/subscribe?add={s.slug}">♥ Back for {money(PER_ARTIST_CENTS)}/mo</a>{/if}
              <p class="tag">{s.tagline}</p>
              <p>{s.about}</p>
              <div class="kv"><span>by</span>{#each creatorsOf(s) as c, i}{i ? ', ' : ''}<a href="/u/{c.handle}">{c.name}</a>{/each}</div>
              <div class="kv"><span>schedule</span>{s.schedule}</div>
              <div class="tags">{#each s.tags as t}<span class="chip brand">{t}</span>{/each}</div>
            </div>
          {/snippet}
        </RightRail>
      </div>
    </div>
  </div>
{/if}

<style>
  .sitetable.classic { background: var(--surface); border: 1px solid var(--line); border-radius: 6px; padding: 4px 0; box-shadow: var(--shadow-sm); }
  .about { background: var(--surface); border: 1px solid var(--line); border-radius: 6px; padding: 12px 14px; display: flex; flex-direction: column; gap: 8px; }
  .about h2 { margin: 0; font-family: var(--classic); font-size: 16px; }
  .about p { margin: 0; font-size: 13px; color: var(--ink-2); line-height: 1.5; }
  .about .tag { font-family: var(--serif); font-style: italic; color: var(--ink-3); }
  .kv { font-size: 12.5px; } .kv span { color: var(--ink-4); margin-right: 6px; } .kv a { color: var(--link); }
  .tags { display: flex; gap: 4px; flex-wrap: wrap; }
  .mhead { gap: 12px; align-items: center; padding: 14px; background: var(--surface); border-bottom: 1px solid var(--line); }
  .mhead h1 { margin: 0; font-size: 20px; }
  @media (max-width: 899px) { .mob-only.mhead { display: flex; } .sitetable.classic { border-radius: 0; } }
</style>
