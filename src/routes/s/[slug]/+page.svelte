<script lang="ts">
  import { page } from '$app/state';
  import Cover from '$lib/components/Cover.svelte';
  import RightRail from '$lib/components/RightRail.svelte';
  import { session } from '$lib/session.svelte';
  import { creatorsOf, episodesOf, epKey, getSeries } from '$lib/data';
  import { money, PER_ARTIST_CENTS } from '$lib/pricing';
  import { ago, compact } from '$lib/time';

  const s = $derived(getSeries(page.params.slug!));
  const eps = $derived(s ? episodesOf(s.slug) : []);
  const following = $derived(!!s && session.follows.includes(s.slug));
  const backed = $derived(!!s && session.sub.picks.includes(s.slug));
  let view = $state<'list' | 'grid'>('list');
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
  <div class="shell mid pad-m">
    <div class="split">
      <div>
        <header class="card hdr">
          <Cover series={s} size={112} radius={14} />
          <div class="grow">
            <h1>{s.title}</h1>
            <div class="muted">by {#each creatorsOf(s) as c, i}{i ? ' & ' : ''}<a href="/u/{c.handle}">{c.name}</a>{/each}</div>
            <p class="tag serif-it">{s.tagline}</p>
            <div class="stats faint">{compact(s.followers + (following ? 1 : 0))} followers · {eps.length} episodes · {s.schedule}</div>
            <div class="row btns">
              <button class="btn" class:primary={!following} onclick={() => session.toggleFollow(s.slug)}>{following ? '✓ Following' : '+ Follow'}</button>
              {#if backed}<a class="btn soft" href="/me/plan">♥ You back this artist</a>
              {:else}<a class="btn soft" href="/subscribe?add={s.slug}">♥ Back for {money(PER_ARTIST_CENTS)}/mo</a>{/if}
            </div>
          </div>
        </header>

        <div class="card pad about"><h3>About</h3><p>{s.about}</p>
          <div class="row">{#each s.tags as t}<span class="chip coup">{t}</span>{/each}</div>
        </div>

        <div class="row eh">
          <h2 class="grow">Episodes</h2>
          <button class="btn small" class:soft={view === 'list'} onclick={() => (view = 'list')}>List</button>
          <button class="btn small" class:soft={view === 'grid'} onclick={() => (view = 'grid')}>Grid</button>
        </div>
        {#if !eps.length}<p class="muted">No episodes yet.</p>{/if}
        <div class={view}>
          {#each eps as e (e.id)}
            {@const read = session.reads.includes(epKey(e))}
            <a class="ep card" class:read href="/s/{s.slug}/{e.id}">
              <Cover series={s} size={view === 'grid' ? '100%' : 56} radius={view === 'grid' ? 0 : 6} />
              <span class="t"><b>#{e.number} · {e.title}</b>
                <small class="faint">{ago(e.publishedAt, session.now)} · ♥ {compact(e.likes)} · {e.comments} comments {#if e.premium}<span class="chip premium">★</span>{/if}</small></span>
            </a>
          {/each}
        </div>
      </div>
      <div class="desk-only"><RightRail /></div>
    </div>
  </div>
{/if}

<style>
  .banner { height: 120px; background: linear-gradient(120deg, hsl(var(--h) 60% 86%), hsl(calc(var(--h) + 40) 55% 90%)); }
  .split { display: grid; grid-template-columns: minmax(0, 1fr) 300px; gap: 20px; margin-top: -70px; }
  @media (max-width: 899px) { .split { grid-template-columns: 1fr; margin-top: -60px; } }
  .hdr { display: flex; gap: 18px; padding: 18px; align-items: flex-start; }
  .hdr h1 { margin: 0 0 2px; font-size: 26px; }
  .tag { margin: 8px 0 4px; color: var(--ink-3); }
  .stats { font-size: 13px; }
  .btns { margin-top: 12px; flex-wrap: wrap; }
  .about { margin-top: 14px; } .about h3 { margin: 0 0 6px; font-size: 14px; } .about p { margin: 0 0 10px; font-size: 14px; color: var(--ink-2); }
  .eh { margin: 18px 0 8px; } .eh h2 { margin: 0; font-size: 18px; }
  .list { display: flex; flex-direction: column; gap: 6px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; }
  .ep { display: flex; gap: 12px; align-items: center; padding: 8px; text-decoration: none; }
  .grid .ep { flex-direction: column; align-items: stretch; padding: 0; overflow: hidden; }
  .grid .ep .t { padding: 8px; }
  .ep .t { display: flex; flex-direction: column; min-width: 0; }
  .ep.read b { color: var(--ink-3); font-weight: 500; }
  .ep small { font-size: 12px; }
  @media (max-width: 520px) { .hdr { flex-direction: column; align-items: center; text-align: center; } .btns { justify-content: center; } }
</style>
