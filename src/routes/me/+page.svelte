<script lang="ts">
  import RequireAuth from '$lib/components/RequireAuth.svelte';
  import Cover from '$lib/components/Cover.svelte';
  import { avatarArt } from '$lib/art';
  import { session } from '$lib/session.svelte';
  import { allEpisodes, allSeries, epKey, getSeries } from '$lib/data';
  import { money, quote } from '$lib/pricing';
  import { ago } from '$lib/time';

  let tab = $state<'following' | 'saved' | 'liked' | 'history'>('following');
  const following = $derived(allSeries().filter((s) => session.follows.includes(s.slug)));
  const byKey = $derived(new Map(allEpisodes().map((e) => [epKey(e), e])));
  const saved = $derived(session.saved.map((k) => byKey.get(k)).filter((e) => !!e));
  const liked = $derived(session.likes.map((k) => byKey.get(k)).filter((e) => !!e));
  const history = $derived(session.reads.slice(0, 60).map((k) => byKey.get(k)).filter((e) => !!e));
</script>

<svelte:head><title>Me — TinyCoup</title><meta name="robots" content="noindex" /></svelte:head>

<RequireAuth>
  {@const a = session.account!}
  <div class="shell mid pad-m">
    <header class="card me">
      <img src={avatarArt(a.handle)} alt="" width="72" height="72" />
      <div class="grow">
        <h1>{a.displayName || a.handle}</h1>
        <div class="faint">@{a.handle} · {a.email}</div>
        <div class="row" style="margin-top:8px;flex-wrap:wrap">
          {#if session.subscribed}<span class="chip ok">Backing {session.sub.picks.length} artist{session.sub.picks.length === 1 ? '' : 's'} · {money(quote(session.sub.picks.length).monthlyCents)}/mo</span>
          {:else}<span class="chip brand">Free reader</span>{/if}
          {#if a.isCreator}<span class="chip premium">Creator</span>{/if}
        </div>
      </div>
      <div class="col">
        <a class="btn" href="/me/plan">My artists</a>
        <a class="btn" href="/me/settings">Settings</a>
      </div>
    </header>

    {#if session.subscribed}
      <div class="card pad artists">
        <div class="row"><h3 class="grow">Your artists</h3><a class="btn small soft" href="/me/plan">Change</a></div>
        <div class="row" style="flex-wrap:wrap;gap:10px">
          {#each session.sub.picks as slug}{@const s = getSeries(slug)}{#if s}<a href="/s/{s.slug}" class="pk"><Cover series={s} size={44} radius={10} /><span>{s.title}</span></a>{/if}{/each}
        </div>
      </div>
    {:else}
      <div class="card pad artists cta">
        <b>Back the artists you read.</b> <span class="muted">$2.49 each per month, 85% to them, and all premium comics unlock.</span>
        <a class="btn primary small" href="/subscribe">Pick artists</a>
      </div>
    {/if}

    <div class="tabs">
      <button class:on={tab === 'following'} onclick={() => (tab = 'following')}>Following ({following.length})</button>
      <button class:on={tab === 'saved'} onclick={() => (tab = 'saved')}>Saved ({saved.length})</button>
      <button class:on={tab === 'liked'} onclick={() => (tab = 'liked')}>Liked ({liked.length})</button>
      <button class:on={tab === 'history'} onclick={() => (tab = 'history')}>History</button>
    </div>

    {#if tab === 'following'}
      <div class="grid">
        {#each following as s (s.slug)}<a class="card tile" href="/s/{s.slug}"><Cover series={s} size="100%" radius={0} /><span>{s.title}</span></a>
        {:else}<p class="muted">Not following anything yet. <a href="/series" style="color:var(--brand)">Browse series</a>.</p>{/each}
      </div>
    {:else}
      {@const list = tab === 'saved' ? saved : tab === 'liked' ? liked : history}
      <div class="list">
        {#each list as e (epKey(e))}
          {@const s = getSeries(e.slug)}
          {#if s}<a class="card li" href="/s/{e.slug}/{e.id}"><Cover series={s} size={44} radius={6} /><span><b>{e.title}</b><small class="faint">{s.title} #{e.number} · {ago(e.publishedAt, session.now)}</small></span></a>{/if}
        {:else}<p class="muted">Nothing here yet.</p>{/each}
      </div>
    {/if}
  </div>
</RequireAuth>

<style>
  .me { display: flex; gap: 18px; align-items: center; padding: 18px; }
  .me img { border-radius: 99px; }
  .me h1 { margin: 0; font-size: 22px; }
  .col { display: flex; flex-direction: column; gap: 6px; }
  .artists { margin-top: 14px; } .artists h3 { margin: 0 0 10px; font-size: 15px; }
  .cta { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; background: var(--cream); border-color: #f0e3bc; font-size: 14px; }
  .pk { display: flex; flex-direction: column; align-items: center; gap: 4px; font-size: 11.5px; width: 70px; text-align: center; }
  .tabs { display: flex; gap: 4px; margin: 20px 0 12px; border-bottom: 1px solid var(--line); }
  .tabs button { border: 0; background: none; padding: 8px 12px; font-weight: 600; color: var(--ink-3); cursor: pointer; border-bottom: 2px solid transparent; }
  .tabs button.on { color: var(--brand); border-color: var(--brand); }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 10px; }
  .tile { overflow: hidden; text-decoration: none; } .tile span { display: block; padding: 8px; font-size: 13px; font-weight: 600; }
  .tile :global(img) { aspect-ratio: 1; }
  .list { display: flex; flex-direction: column; gap: 6px; }
  .li { display: flex; gap: 12px; align-items: center; padding: 8px; text-decoration: none; }
  .li span { display: flex; flex-direction: column; font-size: 14px; }
  @media (max-width: 600px) { .me { flex-wrap: wrap; } .col { flex-direction: row; } }
</style>
