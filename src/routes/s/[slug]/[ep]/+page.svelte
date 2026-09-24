<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import Cover from '$lib/components/Cover.svelte';
  import PanelStack from '$lib/components/PanelStack.svelte';
  import Comments from '$lib/components/Comments.svelte';
  import { session } from '$lib/session.svelte';
  import { creatorLine, episodesOf, epKey, getEpisode, getSeries, liveEpisode } from '$lib/data';
  import { premiumPanels } from '$lib/api';
  import { money, PER_ARTIST_CENTS } from '$lib/pricing';
  import { compact, longDate } from '$lib/time';
  import type { Episode, PanelSrc } from '$lib/types';

  let fetched = $state<Episode | null>(null);
  let unlocked = $state<PanelSrc[] | null>(null);
  let copied = $state(false);

  const slug = $derived(page.params.slug!);
  const id = $derived(page.params.ep!);
  const s = $derived(getSeries(slug));
  const ep = $derived(getEpisode(slug, id) ?? (fetched?.id === id ? fetched : undefined));
  const list = $derived(episodesOf(slug));
  const idx = $derived(list.findIndex((e) => e.id === id));
  const newer = $derived(idx > 0 ? list[idx - 1] : null);
  const older = $derived(idx >= 0 && idx < list.length - 1 ? list[idx + 1] : null);
  const key = $derived(ep ? epKey(ep) : '');
  const liked = $derived(session.likes.includes(key));
  const following = $derived(!!s && session.follows.includes(slug));

  $effect(() => { if (session.ready && !getEpisode(slug, id)) liveEpisode(slug, id).then((e) => (fetched = e)).catch(() => {}); });
  $effect(() => { if (key && session.ready) session.markRead(key); });
  $effect(() => {
    unlocked = null;
    if (ep?.premium && session.subscribed) premiumPanels(slug, id).then((p) => (unlocked = p)).catch(() => {});
  });

  function like() { if (!session.account) return goto(`/login?next=${encodeURIComponent(page.url.pathname)}`); session.toggleLike(key); }
  async function share() {
    const url = location.href;
    if (navigator.share) return navigator.share({ title: `${ep?.title} — ${s?.title}`, url }).catch(() => {});
    await navigator.clipboard.writeText(url); copied = true; setTimeout(() => (copied = false), 1500);
  }
  function onkey(e: KeyboardEvent) {
    if (/input|textarea/i.test((e.target as HTMLElement).tagName)) return;
    if (e.key === 'ArrowLeft' && older) goto(`/s/${slug}/${older.id}`);
    if (e.key === 'ArrowRight' && newer) goto(`/s/${slug}/${newer.id}`);
  }
</script>

<svelte:window onkeydown={onkey} />
<svelte:head>
  {#if ep && s}
    <title>{ep.title} — {s.title} #{ep.number} | TinyCoup</title>
    <meta name="description" content={ep.caption ?? `${s.title} by ${creatorLine(s)}. ${s.tagline}`} />
    <meta property="og:type" content="article" />
    <meta property="og:title" content="{ep.title} — {s.title}" />
    <meta property="og:description" content={s.tagline} />
    <!-- TODO(live): og:image = first panel's 1600 webp (seed art is SVG, which link previews don't render) -->
    {#if ep.panels[0]?.kind === 'img'}<meta property="og:image" content="{ep.panels[0].base}-1600.webp" />{/if}
    <meta name="twitter:card" content="summary_large_image" />
  {/if}
</svelte:head>

{#if !ep || !s}
  <div class="shell narrow pad-m" style="text-align:center;padding-top:60px">
    {#if session.ready}<h1>This episode isn't here.</h1><a class="btn primary" href="/s/{slug}">Back to the series</a>{:else}<p class="faint">Loading…</p>{/if}
  </div>
{:else}
  <div class="reader">
    <header class="by">
      <a href="/s/{s.slug}" class="row who"><Cover series={s} size={40} radius={99} />
        <span><b>{s.title}</b><small class="faint">{creatorLine(s)}</small></span></a>
      <span class="grow"></span>
      <button class="btn small" class:primary={!following} onclick={() => session.toggleFollow(s.slug)}>{following ? 'Following' : '+ Follow'}</button>
    </header>

    <h1>{ep.title}</h1>
    <div class="faint meta">#{ep.number} · {longDate(ep.publishedAt)} {#if ep.premium}<span class="chip premium">★ Premium</span>{/if}</div>

    <div class="panels">
      <PanelStack panels={unlocked ?? ep.panels} hue={s.hue} premium={ep.premium} eagerFirst />
    </div>
    {#if ep.caption}<p class="caption serif-it">{ep.caption}</p>{/if}

    <div class="acts">
      <button class="btn" class:liked onclick={like} aria-pressed={liked}>♥ {compact(ep.likes + (liked ? 1 : 0))}</button>
      <a class="btn" href="#comments">💬 {ep.comments}</a>
      <button class="btn" onclick={share}>{copied ? 'Link copied' : '↗ Share'}</button>
      <span class="grow"></span>
      {#if older}<a class="btn" href="/s/{slug}/{older.id}" title="Previous (←)">← Prev</a>{/if}
      {#if newer}<a class="btn" href="/s/{slug}/{newer.id}" title="Next (→)">Next →</a>{/if}
    </div>

    <div class="card back">
      <Cover series={s} size={52} radius={10} />
      <div class="grow">
        {#if session.sub.picks.includes(s.slug)}
          <b>You back {creatorLine(s)}.</b><div class="muted">Part of your plan goes straight to them every month. Thank you.</div>
        {:else}
          <b>Like this? Back {creatorLine(s)} directly.</b><div class="muted">{money(PER_ARTIST_CENTS)}/month, 85% to the artist, and every premium comic on TinyCoup unlocks.</div>
        {/if}
      </div>
      {#if !session.sub.picks.includes(s.slug)}<a class="btn primary" href="/subscribe?add={s.slug}">Back artist</a>{/if}
    </div>

    <Comments slug={s.slug} id={ep.id} />
  </div>
{/if}

<style>
  .reader { max-width: 720px; margin: 0 auto; padding: 16px 20px calc(var(--bottom-nav) + 40px); }
  .by { display: flex; align-items: center; gap: 10px; }
  .who { text-decoration: none; } .who span { display: flex; flex-direction: column; font-size: 14px; }
  h1 { margin: 16px 0 2px; font-size: 26px; }
  .meta { font-size: 13px; display: flex; gap: 8px; align-items: center; }
  .panels { margin: 16px 0 0; }
  .caption { color: var(--ink-3); margin: 12px 0 0; }
  .acts { display: flex; gap: 6px; flex-wrap: wrap; margin: 16px 0; }
  .liked { color: var(--heart); border-color: #f3b9bb; background: #fff5f5; }
  .back { display: flex; gap: 14px; align-items: center; padding: 14px 16px; background: var(--cream); border-color: #f0e3bc; font-size: 14px; }
  .back .muted { font-size: 13px; margin-top: 2px; }
  @media (max-width: 899px) {
    .reader { padding: 12px 0 calc(var(--bottom-nav) + 40px); }
    .by, h1, .meta, .caption, .acts { padding-left: 14px; padding-right: 14px; }
    .back { margin: 0 14px; flex-wrap: wrap; }
  }
</style>
