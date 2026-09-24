<script lang="ts">
  // One post in the feed. Card (default) looks like new reddit / Tinyview;
  // Compact and Classic are denser list views for fast scanning.
  import Cover from './Cover.svelte';
  import Panel from './Panel.svelte';
  import PanelStack from './PanelStack.svelte';
  import { session } from '$lib/session.svelte';
  import { creatorLine, epKey, getSeries } from '$lib/data';
  import { ago, compact } from '$lib/time';
  import type { Density, Episode } from '$lib/types';

  let { ep, density, rank, selected = false, expanded = false, showSeries = true, ontoggle, onselect }: {
    ep: Episode; density: Density; rank: number; selected?: boolean; expanded?: boolean; showSeries?: boolean;
    ontoggle: () => void; onselect: () => void;
  } = $props();

  const s = $derived(getSeries(ep.slug));
  const key = $derived(epKey(ep));
  const liked = $derived(session.likes.includes(key));
  const saved = $derived(session.saved.includes(key));
  const read = $derived(session.reads.includes(key));
  const following = $derived(session.follows.includes(ep.slug));
  const href = $derived(`/s/${ep.slug}/${ep.id}`);
  const likes = $derived(ep.likes + (liked ? 1 : 0));
  const when = $derived(ago(ep.publishedAt, session.now));

  function needLogin() {
    if (session.account) return false;
    location.href = `/login?next=${encodeURIComponent(location.pathname)}`;
    return true;
  }
  const like = () => !needLogin() && session.toggleLike(key);
  const save = () => !needLogin() && session.toggleSave(key);
  const hide = () => !needLogin() && session.toggleHide(key);
  const follow = () => !needLogin() && session.toggleFollow(ep.slug);
  function toggle() { ontoggle(); if (!expanded) session.markRead(key); }
</script>

{#snippet actions(small: boolean)}
  <div class="acts" class:small>
    <button class="a heart" class:on={liked} onclick={like} aria-pressed={liked} aria-label="Like">
      <svg viewBox="0 0 24 24"><path d="M12 20.5s-7.5-4.6-9.3-9.2A4.8 4.8 0 0112 7.2a4.8 4.8 0 019.3 4.1c-1.8 4.6-9.3 9.2-9.3 9.2z" /></svg>{compact(likes)}
    </button>
    <a class="a" href="{href}#comments"><svg viewBox="0 0 24 24"><path d="M4 5h16v11H9l-5 4z" /></svg>{ep.comments}</a>
    {#if density !== 'card' || expanded}
      <button class="a" onclick={toggle} aria-expanded={expanded}>
        <svg viewBox="0 0 24 24"><path d={expanded ? 'M6 15l6-6 6 6' : 'M6 9l6 6 6-6'} /></svg>{expanded ? 'Collapse' : `${ep.panels.length} panels`}
      </button>
    {/if}
    <a class="a" href="/share?u={encodeURIComponent(href)}"><svg viewBox="0 0 24 24"><path d="M14 5l6 6-6 6M20 11H9a5 5 0 00-5 5v2" /></svg>Share</a>
    <button class="a" class:on={saved} onclick={save}><svg viewBox="0 0 24 24"><path d="M6 3h12v18l-6-4-6 4z" /></svg><span class="desk-only">{saved ? 'Saved' : 'Save'}</span></button>
    <button class="a desk-only" onclick={hide} title="Hide from your feed" aria-label="Hide"><svg viewBox="0 0 24 24"><path d="M3 3l18 18M10.6 5.1A10 10 0 0122 12a13 13 0 01-2.7 3.4M6.6 6.6A13 13 0 002 12s3.6 7 10 7a9.7 9.7 0 004.4-1" /></svg></button>
  </div>
{/snippet}

{#if s}
<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
<article class="post {density}" class:sel={selected} class:read data-key={key} onclick={onselect}>
  {#if density === 'card'}
    <header class="head">
      <a href="/s/{s.slug}" class="who"><Cover series={s} size={36} radius={99} /></a>
      <div class="meta">
        <a href="/s/{s.slug}" class="sname">{s.title}</a>
        <span class="faint">· {when}</span>
        <div class="by">{creatorLine(s)}</div>
      </div>
      <button class="btn small follow" class:primary={!following} onclick={follow}>{following ? 'Following' : 'Follow'}</button>
    </header>
    <h2 class="title"><a {href}>{ep.title}</a>{#if ep.premium}<span class="chip premium">★ Premium</span>{/if}</h2>
    {#if ep.caption}<p class="cap">{ep.caption}</p>{/if}
    {#if !expanded}
      <button class="preview" onclick={toggle} aria-label="Read {ep.title}">
        <Panel panel={ep.panels[0]} hue={s.hue} eager={rank <= 2} />
        {#if ep.panels.length > 1}<span class="more">1 / {ep.panels.length} · Tap to read</span>{/if}
      </button>
    {/if}
  {:else}
    <div class="row-in">
      {#if density === 'classic'}<span class="rank">{rank}</span>{/if}
      <a {href} class="thumb" tabindex="-1" aria-hidden="true"><Cover series={s} size={density === 'classic' ? 56 : 88} radius={10} /></a>
      <div class="body">
        <div class="meta sm">
          {#if showSeries}<a href="/s/{s.slug}" class="sname">{s.title}</a><span class="faint">·</span>{/if}
          <span class="faint">{creatorLine(s)} · #{ep.number} · {when}</span>
        </div>
        <h2 class="title"><a {href}>{ep.title}</a>{#if ep.premium}<span class="chip premium">★</span>{/if}</h2>
        {@render actions(true)}
      </div>
    </div>
  {/if}

  {#if expanded}
    <div class="inline"><PanelStack panels={ep.panels} hue={s.hue} premium={ep.premium} /></div>
  {/if}
  {#if density === 'card'}{@render actions(false)}{/if}
</article>
{/if}

<style>
  .post { background: var(--surface); border: 1px solid var(--line); border-radius: 16px; margin-bottom: 14px; padding: 14px 16px 12px; box-shadow: var(--shadow-sm); transition: border-color 0.15s; }
  .post:hover { border-color: var(--line-strong); }
  .post.sel { border-color: var(--brand); box-shadow: 0 0 0 3px var(--brand-ring); }
  .head { display: flex; gap: 10px; align-items: center; }
  .who { display: flex; }
  .meta { flex: 1; min-width: 0; font-size: 13.5px; line-height: 1.3; }
  .meta.sm { font-size: 12.5px; display: flex; gap: 5px; flex-wrap: wrap; align-items: center; }
  .sname { font-weight: 700; color: var(--ink); }
  .by { font-size: 12.5px; color: var(--ink-3); }
  .follow { flex: 0 0 auto; }
  .title { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin: 10px 0 6px; font-size: 19px; line-height: 1.3; font-weight: 700; letter-spacing: -0.01em; }
  .title a { color: var(--ink); }
  .post.read .title a { color: var(--ink-3); }
  .cap { margin: 0 0 10px; font-family: var(--serif); font-style: italic; font-size: 14.5px; color: var(--ink-3); }
  .preview { display: block; width: 100%; padding: 0; border: 0; cursor: pointer; position: relative; border-radius: 12px; overflow: hidden; background: none; }
  .more { position: absolute; right: 12px; bottom: 12px; background: rgba(0, 0, 0, 0.72); color: #fff; font-size: 12.5px; font-weight: 600; padding: 5px 12px; border-radius: 99px; }
  .inline { margin-top: 10px; }
  .inline :global(.panel) { border-radius: 10px; }

  .acts { display: flex; align-items: center; gap: 6px; margin-top: 12px; flex-wrap: wrap; }
  .a { display: inline-flex; align-items: center; gap: 6px; height: 34px; padding: 0 12px; border-radius: 999px; background: var(--surface-3); border: 0; cursor: pointer; color: var(--ink-2); font-size: 13px; font-weight: 600; text-decoration: none !important; transition: background 0.12s, color 0.12s; }
  .a:hover { background: var(--line); }
  .a svg { width: 17px; height: 17px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
  .heart.on { color: var(--heart); background: var(--heart-bg); }
  .heart.on svg { fill: currentColor; }
  .a.on:not(.heart) { color: var(--brand); background: var(--brand-tint); }
  .a.on:not(.heart) svg { fill: currentColor; }
  .acts.small { margin-top: 6px; gap: 2px; }
  .acts.small .a { height: 28px; padding: 0 9px; font-size: 12px; background: transparent; }
  .acts.small .a:hover { background: var(--surface-3); }

  /* compact + classic: list rows */
  .post.compact, .post.classic { padding: 10px 12px; margin-bottom: 8px; border-radius: 12px; }
  .row-in { display: flex; gap: 14px; align-items: flex-start; }
  .rank { width: 22px; text-align: right; color: var(--ink-4); font-weight: 600; font-size: 14px; padding-top: 18px; flex: 0 0 auto; }
  .thumb { flex: 0 0 auto; display: flex; }
  .body { flex: 1; min-width: 0; }
  .compact .title, .classic .title { margin: 2px 0 0; font-size: 16px; }
  .post.classic { margin-bottom: 0; border-radius: 0; box-shadow: none; border-width: 0 0 1px; padding: 8px 12px; }
  .post.classic:hover { background: var(--surface-2); border-color: var(--line); }
  .post.classic.sel { box-shadow: inset 3px 0 0 var(--brand); background: var(--row-sel); }
  .post.classic .title { font-size: 15px; font-weight: 600; }

  @media (max-width: 899px) {
    .post { border-radius: 0; border-left: 0; border-right: 0; margin-bottom: 8px; box-shadow: none; }
    .post.card .preview { margin-left: -16px; margin-right: -16px; width: calc(100% + 32px); border-radius: 0; }
    .post.card .inline { margin-left: -16px; margin-right: -16px; }
    .post.card .inline :global(.panel) { border-radius: 0; }
    .title { font-size: 17px; }
  }
</style>
