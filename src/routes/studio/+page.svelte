<script lang="ts">
  import { goto } from '$app/navigation';
  import RequireAuth from '$lib/components/RequireAuth.svelte';
  import Cover from '$lib/components/Cover.svelte';
  import { session } from '$lib/session.svelte';
  import { allSeries, episodesOf } from '$lib/data';
  import { creatorOnboard, joinWaitlist } from '$lib/api';
  import { on } from '$lib/features';
  import { mode } from '$lib/firebase.svelte';
  import { money, PER_ARTIST_CENTS, CREATOR_SHARE } from '$lib/pricing';
  import { ago, compact } from '$lib/time';

  let busy = $state(false);
  let err = $state('');
  let listed = $state(false);
  async function creatorList() { try { await joinWaitlist(session.account!.email, true); listed = true; } catch (e) { err = (e as Error).message; } }
  const mine = $derived(allSeries().filter((s) => session.account && s.creatorUids.includes(session.account.uid)));
  const eps = $derived(mine.flatMap((s) => episodesOf(s.slug)));

  async function onboard() {
    busy = true; err = '';
    try { const url = await creatorOnboard(); if (url.startsWith('http')) location.href = url; else goto(url); } catch (e) { err = (e as Error).message; }
    busy = false;
  }
</script>

<svelte:head><title>Creator studio — TinyCoup</title><meta name="robots" content="noindex" /></svelte:head>

<RequireAuth>
  <div class="shell mid pad-m">
    {#if !session.isCreator}
      <div class="card pitch">
        <h1>Publish on TinyCoup</h1>
        <p class="serif-it muted">Readers subscribe to <em>you</em>, not a tier.</p>
        <ul>
          <li><b>You keep 85%</b> of every {money(PER_ARTIST_CENTS)} artist subscription. We cover card fees out of our 15%.</li>
          <li><b>Paid monthly</b> through Stripe Connect. Stripe handles identity checks and tax forms.</li>
          <li><b>You own your work.</b> Non-exclusive; post it anywhere else too.</li>
          <li><b>Upload at full size.</b> We make the 1600px retina and 800px versions and serve them fast.</li>
        </ul>
        {#if on('creators')}
          <button class="btn primary big" onclick={onboard} disabled={busy}>{busy ? 'Opening Stripe…' : 'Set up payouts & start'}</button>
        {:else if listed}
          <p><b>You're on the creator list.</b> We'll email {session.account?.email} when publishing opens.</p>
        {:else}
          <p class="muted">Publishing opens at launch.</p>
          <button class="btn primary big" onclick={creatorList}>Put me on the creator list</button>
        {/if}
        {#if err}<p class="error">{err}</p>{/if}
        {#if !mode.live}<div class="todo-box" style="margin-top:14px"><b>Demo mode:</b> this skips Stripe Connect onboarding and flips your account to creator in this browser.</div>{/if}
      </div>
    {:else}
      <div class="row top"><h1 class="grow">Creator studio</h1>
        <a class="btn" href="/studio/payouts">Payouts</a>
        <a class="btn" href="/studio/new-series">+ New series</a>
        {#if mine.length}<a class="btn primary" href="/studio/upload">+ New episode</a>{/if}
      </div>

      <div class="stats">
        <div class="card pad"><div class="k">Series</div><div class="v">{mine.length}</div></div>
        <div class="card pad"><div class="k">Episodes</div><div class="v">{eps.length}</div></div>
        <div class="card pad"><div class="k">Followers</div><div class="v">{compact(mine.reduce((a, s) => a + s.followers, 0))}</div></div>
        <div class="card pad"><div class="k">Backers</div><div class="v">—</div><div class="faint small">TODO(live): count of active subs picking you</div></div>
        <div class="card pad"><div class="k">Per backer / mo</div><div class="v">{money(Math.round(PER_ARTIST_CENTS * CREATOR_SHARE))}</div></div>
      </div>

      {#if !mine.length}
        <div class="card pad empty"><h3>Start your first series</h3><p class="muted">A series is the thing readers follow and back. Episodes go inside it.</p><a class="btn primary" href="/studio/new-series">Create a series</a></div>
      {/if}

      {#each mine as s (s.slug)}
        {@const list = episodesOf(s.slug)}
        <div class="card ser">
          <div class="row pad"><Cover series={s} size={52} radius={10} />
            <div class="grow"><a href="/s/{s.slug}"><b>{s.title}</b></a><div class="faint small">{list.length} episodes · {compact(s.followers)} followers</div></div>
            <a class="btn small soft" href="/studio/upload?series={s.slug}">+ Episode</a>
          </div>
          <table>
            <thead><tr><th>#</th><th>Title</th><th>Published</th><th>♥</th><th>💬</th><th>Views</th><th></th></tr></thead>
            <tbody>
              {#each list as e (e.id)}
                <tr><td>{e.number}</td><td><a href="/s/{s.slug}/{e.id}">{e.title}</a> {#if e.premium}<span class="chip premium">★</span>{/if}</td>
                  <td>{ago(e.publishedAt, session.now)}</td><td>{e.likes}</td><td>{e.comments}</td><td>{compact(e.views)}</td>
                  <td><button class="btn small ghost" disabled title="TODO: edit title/caption/premium, reorder or replace panels, unpublish">Edit</button></td></tr>
              {:else}<tr><td colspan="7" class="faint">No episodes yet.</td></tr>{/each}
            </tbody>
          </table>
        </div>
      {/each}
    {/if}
  </div>
</RequireAuth>

<style>
  .pitch { max-width: 640px; margin: 20px auto; padding: 28px; }
  .pitch h1 { margin: 0; } .pitch li { margin: 8px 0; line-height: 1.5; }
  .top { margin-bottom: 14px; flex-wrap: wrap; } .top h1 { margin: 8px 0; }
  .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; margin-bottom: 16px; }
  .k { font-size: 11px; text-transform: uppercase; letter-spacing: 0.07em; color: var(--ink-4); font-weight: 700; }
  .v { font-size: 22px; font-weight: 700; margin-top: 2px; }
  .small { font-size: 12px; }
  .empty { text-align: center; }
  .ser { margin-bottom: 14px; overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
  th, td { text-align: left; padding: 7px 12px; border-top: 1px solid var(--line); white-space: nowrap; }
  th { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--ink-4); }
</style>
