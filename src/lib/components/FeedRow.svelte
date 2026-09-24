<script lang="ts">
  import Cover from './Cover.svelte';
  import Panel from './Panel.svelte';
  import PanelStack from './PanelStack.svelte';
  import { session } from '$lib/session.svelte';
  import { creatorLine, epKey, getSeries } from '$lib/data';
  import { ago, compact } from '$lib/time';
  import type { Density, Episode } from '$lib/types';

  let { ep, density, rank, selected = false, expanded = false, ontoggle, onselect }:
    { ep: Episode; density: Density; rank: number; selected?: boolean; expanded?: boolean; ontoggle: () => void; onselect: () => void } = $props();

  const s = $derived(getSeries(ep.slug)!);
  const key = $derived(epKey(ep));
  const liked = $derived(session.likes.includes(key));
  const read = $derived(session.reads.includes(key));
  const following = $derived(session.follows.includes(ep.slug));
  const href = $derived(`/s/${ep.slug}/${ep.id}`);
  const likes = $derived(ep.likes + (liked ? 1 : 0));

  function like() {
    if (!session.account) return void (location.href = `/login?next=${encodeURIComponent(location.pathname)}`);
    session.toggleLike(key);
  }
  function toggle() { ontoggle(); if (!expanded) session.markRead(key); }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
<article class="post {density}" class:sel={selected} class:read data-key={key} onclick={onselect}>
  {#if density === 'classic'}
    <span class="rank">{rank}</span>
    <div class="vote">
      <button class="heart" class:on={liked} onclick={like} aria-pressed={liked} aria-label="Like">♥</button>
      <span>{compact(likes)}</span>
    </div>
    <a {href} class="thumb"><Cover series={s} size={48} radius={4} /></a>
    <div class="body">
      <div class="title"><a {href}>{ep.title}</a>
        <span class="faint small">({s.title} #{ep.number})</span>
        {#if ep.premium}<span class="chip premium">★</span>{/if}
      </div>
      <div class="meta">
        {ago(ep.publishedAt, session.now)} ago by <a href="/s/{s.slug}">{creatorLine(s)}</a>
      </div>
      <div class="acts">
        <a href="{href}#comments">{ep.comments} comments</a>
        <button onclick={toggle}>{expanded ? 'collapse' : 'expand'}</button>
        <button onclick={() => session.toggleFollow(s.slug)}>{following ? 'unfollow' : 'follow'}</button>
        <a href="/share?u={encodeURIComponent(href)}">share</a>
      </div>
    </div>
  {:else}
    <header class="head">
      {#if density === 'compact'}
        <a {href} class="thumb" aria-hidden="true" tabindex="-1"><Cover series={s} size={72} radius={8} /></a>
      {:else}
        <Cover series={s} size={34} radius={99} />
      {/if}
      <div class="body">
        {#if density === 'card'}
          <div class="meta"><a href="/s/{s.slug}"><b>{s.title}</b></a> · {creatorLine(s)} · {ago(ep.publishedAt, session.now)}</div>
        {/if}
        <div class="title">
          <a {href}>{ep.title}</a>
          {#if ep.premium}<span class="chip premium">★ Premium</span>{/if}
          {#if !read}<span class="newdot" title="Unread"></span>{/if}
        </div>
        {#if density === 'compact'}
          <div class="meta"><a href="/s/{s.slug}">{s.title}</a> · {creatorLine(s)} · #{ep.number} · {ago(ep.publishedAt, session.now)}</div>
        {/if}
      </div>
      <button class="btn small follow" class:soft={!following} onclick={() => session.toggleFollow(s.slug)}>{following ? 'Following' : '+ Follow'}</button>
    </header>

    {#if density === 'card' && !expanded}
      <button class="preview" onclick={toggle} aria-label="Read {ep.title}">
        <Panel panel={ep.panels[0]} hue={s.hue} eager={rank <= 2} />
        {#if ep.panels.length > 1}<span class="more">1 / {ep.panels.length} · tap to read</span>{/if}
      </button>
    {/if}

    <footer class="acts">
      <button class="heart" class:on={liked} onclick={like} aria-pressed={liked}>♥ {compact(likes)}</button>
      <a href="{href}#comments">💬 {ep.comments}</a>
      <button onclick={toggle} aria-expanded={expanded}>{expanded ? '▴ Collapse' : `▾ ${density === 'card' ? 'Read all' : 'Expand'} · ${ep.panels.length} panel${ep.panels.length === 1 ? '' : 's'}`}</button>
      <span class="grow"></span>
      <a href="/share?u={encodeURIComponent(href)}" class="desk-only">Share</a>
    </footer>
  {/if}

  {#if expanded}
    <div class="inline"><PanelStack panels={ep.panels} hue={s.hue} premium={ep.premium} /></div>
  {/if}
</article>

<style>
  .post { background: var(--surface); border: 1px solid var(--line); border-radius: 10px; margin-bottom: 8px; padding: 10px 12px; position: relative; }
  .post.sel { border-color: var(--coup); box-shadow: 0 0 0 2px var(--coup-ring); }
  .post.read .title a { color: var(--ink-3); }
  .title { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; font-weight: 600; font-size: 15.5px; line-height: 1.3; }
  .title a { color: var(--ink); }
  .meta { font-size: 12.5px; color: var(--ink-4); margin-top: 2px; }
  .meta a { color: var(--ink-3); }
  .small { font-size: 12px; font-weight: 400; }
  .newdot { width: 7px; height: 7px; border-radius: 99px; background: var(--coup); }
  .head { display: flex; gap: 12px; align-items: center; }
  .body { flex: 1; min-width: 0; }
  .follow { flex: 0 0 auto; }
  .acts { display: flex; align-items: center; gap: 4px; margin-top: 8px; font-size: 12.5px; color: var(--ink-3); font-weight: 600; }
  .acts > * { background: none; border: 0; padding: 5px 8px; border-radius: 6px; cursor: pointer; color: inherit; text-decoration: none; font-weight: 600; }
  .acts > *:hover { background: #f5f4f2; text-decoration: none; }
  .heart.on { color: var(--heart); }
  .inline { margin-top: 10px; max-width: 680px; }
  .preview { display: block; width: 100%; padding: 0; border: 0; margin-top: 10px; cursor: pointer; position: relative; border-radius: 8px; overflow: hidden; background: none; }
  .more { position: absolute; right: 10px; bottom: 10px; background: rgba(23, 23, 23, 0.72); color: #fff; font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 99px; }

  /* old-reddit "classic": dense text row */
  .post.classic { display: grid; grid-template-columns: 26px 38px 48px 1fr; gap: 8px; align-items: start; padding: 6px 8px; margin-bottom: 2px; border-radius: 4px; border-color: transparent; background: transparent; }
  .post.classic:nth-of-type(odd) { background: rgba(255, 255, 255, 0.6); }
  .post.classic.sel { background: #fff; }
  .post.classic .inline { grid-column: 1 / -1; }
  .rank { text-align: right; color: var(--ink-4); font-size: 15px; padding-top: 12px; }
  .vote { display: flex; flex-direction: column; align-items: center; font-size: 11.5px; font-weight: 700; color: var(--ink-3); }
  .vote .heart { border: 0; background: none; font-size: 18px; cursor: pointer; color: #c9c3b4; padding: 0; line-height: 1.2; }
  .vote .heart.on { color: var(--heart); }
  .post.classic .title { font-size: 15px; font-weight: 500; }
  .post.classic .acts { margin-top: 1px; font-size: 11.5px; gap: 0; }
  .post.classic .acts > * { padding: 1px 5px 1px 0; font-weight: 700; color: var(--ink-4); }
  .post.classic .acts > *:hover { background: none; text-decoration: underline; }

  @media (max-width: 899px) {
    .post { border-radius: 0; border-left: 0; border-right: 0; margin-bottom: 6px; padding: 12px 14px; }
    .post.card .preview { margin-left: -14px; margin-right: -14px; width: calc(100% + 28px); border-radius: 0; }
    .post.card .inline { margin-left: -14px; margin-right: -14px; }
  }
</style>
