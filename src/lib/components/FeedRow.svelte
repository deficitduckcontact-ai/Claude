<script lang="ts">
  import Cover from './Cover.svelte';
  import Panel from './Panel.svelte';
  import PanelStack from './PanelStack.svelte';
  import { session } from '$lib/session.svelte';
  import { creatorLine, epKey, getSeries } from '$lib/data';
  import { ago, agoText, compact } from '$lib/time';
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

{#if s}
<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
<article class="post {density}" class:sel={selected} class:read data-key={key} onclick={onselect}>
  {#if density === 'classic'}
    <span class="rank">{rank}</span>
    <div class="vote">
      <button class="heart" class:on={liked} onclick={like} aria-pressed={liked} aria-label="Like">♥</button>
      <span class:on={liked}>{compact(likes)}</span>
    </div>
    <a {href} class="thumb" tabindex="-1" aria-hidden="true"><Cover series={s} size={70} radius={3} /></a>
    <div class="entry">
      <p class="title">
        <a {href} class="t">{ep.title}</a>
        <span class="domain">({s.title} #{ep.number})</span>
        {#if ep.premium}<span class="flair">★ premium</span>{/if}
      </p>
      <p class="tagline">
        <button class="expando" class:open={expanded} onclick={toggle} aria-expanded={expanded} aria-label={expanded ? 'Collapse' : 'Expand'} title="{ep.panels.length} panels">{expanded ? '✕' : '▸'}</button>
        submitted <time>{agoText(ep.publishedAt, session.now)}</time> by <a href="/s/{s.slug}" class="au">{creatorLine(s)}</a>
        {#if showSeries}to <a href="/s/{s.slug}" class="sr">s/{s.slug}</a>{/if}
      </p>
      <ul class="buttons">
        <li><a href="{href}#comments" class="cm">{ep.comments} comment{ep.comments === 1 ? '' : 's'}</a></li>
        <li><a href="/share?u={encodeURIComponent(href)}">share</a></li>
        <li><button onclick={save}>{saved ? 'unsave' : 'save'}</button></li>
        <li><button onclick={hide}>hide</button></li>
        <li><button onclick={follow}>{following ? 'unfollow' : 'follow'}</button></li>
      </ul>
    </div>
  {:else}
    <header class="head">
      {#if density === 'compact'}
        <a {href} class="thumb" aria-hidden="true" tabindex="-1"><Cover series={s} size={72} radius={6} /></a>
      {:else}
        <Cover series={s} size={40} radius={99} />
      {/if}
      <div class="body">
        {#if density === 'card'}
          <div class="meta"><a href="/s/{s.slug}"><b>{s.title}</b></a> · {creatorLine(s)} · {when}</div>
        {/if}
        <div class="title">
          <a {href} class="t">{ep.title}</a>
          {#if ep.premium}<span class="chip premium">★ Premium</span>{/if}
        </div>
        {#if density === 'compact'}
          <div class="meta"><a href="/s/{s.slug}">s/{s.slug}</a> · {creatorLine(s)} · #{ep.number} · {when}</div>
        {/if}
      </div>
      <button class="btn small follow" class:soft={!following} onclick={follow}>{following ? 'Following' : '+ Follow'}</button>
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
      <button onclick={toggle} aria-expanded={expanded}>{expanded ? '▴ Collapse' : `▾ ${density === 'card' ? 'Read all' : 'Expand'} · ${ep.panels.length}`}</button>
      <span class="grow"></span>
      <button onclick={save} class="desk-only">{saved ? 'Saved' : 'Save'}</button>
      <button onclick={hide} class="desk-only">Hide</button>
      <a href="/share?u={encodeURIComponent(href)}">Share</a>
    </footer>
  {/if}

  {#if expanded}
    <div class="inline"><PanelStack panels={ep.panels} hue={s.hue} premium={ep.premium} /></div>
  {/if}
</article>
{/if}

<style>
  .post { background: var(--surface); border: 1px solid var(--line); border-radius: 8px; margin-bottom: 8px; padding: 10px 12px; position: relative; box-shadow: var(--shadow-sm); }
  .post.sel { border-color: var(--brand); box-shadow: 0 0 0 2px var(--brand-ring); }
  .title { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; margin: 0; line-height: 1.3; }
  .t { color: var(--ink); font-weight: 600; font-size: 16px; }
  .post.read .t { color: var(--link-read); }
  .meta { font-size: 12.5px; color: var(--ink-4); margin-top: 2px; }
  .meta a { color: var(--ink-3); }
  .head { display: flex; gap: 12px; align-items: center; }
  .body { flex: 1; min-width: 0; }
  .follow { flex: 0 0 auto; }
  .acts { display: flex; align-items: center; gap: 2px; margin-top: 8px; font-size: 13px; color: var(--ink-3); font-weight: 600; }
  .acts > * { background: none; border: 0; padding: 6px 9px; border-radius: 6px; cursor: pointer; color: inherit; text-decoration: none; font-weight: 600; }
  .acts > *:hover { background: var(--page); text-decoration: none; }
  .heart.on { color: var(--heart); }
  .inline { margin-top: 10px; max-width: 720px; }
  .preview { display: block; width: 100%; padding: 0; border: 0; margin-top: 10px; cursor: pointer; position: relative; border-radius: 6px; overflow: hidden; background: none; }
  .more { position: absolute; right: 10px; bottom: 10px; background: rgba(0, 0, 0, 0.7); color: #fff; font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 99px; }
  .post.card { max-width: 720px; }

  /* ---------- classic: old reddit ---------- */
  .post.classic {
    display: grid; grid-template-columns: 28px 36px 70px minmax(0, 1fr); column-gap: 8px; align-items: start;
    font-family: var(--classic); border: 0; border-radius: 0; box-shadow: none; margin: 0; padding: 7px 10px 6px 4px; background: transparent;
  }
  .post.classic.sel { background: var(--row-sel); box-shadow: inset 3px 0 0 var(--brand); }
  .post.classic + :global(.post.classic) { border-top: 1px solid var(--hairline); }
  .rank { text-align: right; color: var(--idle); font-size: 15px; padding-top: 20px; font-family: arial, sans-serif; }
  .vote { display: flex; flex-direction: column; align-items: center; font-size: 12px; font-weight: 700; color: var(--idle); padding-top: 6px; }
  .vote span { color: var(--ink-4); } .vote span.on { color: var(--heart); }
  .vote .heart { border: 0; background: none; font-size: 17px; cursor: pointer; color: var(--idle); padding: 0; line-height: 1.1; }
  .vote .heart:hover { color: var(--heart); }
  .vote .heart.on { color: var(--heart); }
  .thumb { display: block; }
  .entry { min-width: 0; }
  .classic .title { gap: 5px; }
  .classic .t { font-family: var(--classic); font-weight: 400; font-size: 16px; color: var(--link); }
  .classic.read .t { color: var(--link-read); }
  .classic .t:visited { color: var(--link-read); }
  .domain { font-size: 10px; color: var(--meta); }
  .flair { font-size: 10px; background: var(--flair); border: 1px solid var(--flair-line); color: var(--flair-ink); border-radius: 2px; padding: 0 4px; }
  .tagline { margin: 2px 0 0; font-size: 10px; color: var(--meta); display: flex; align-items: center; gap: 3px; flex-wrap: wrap; }
  .tagline a { color: var(--link); }
  .tagline .au { color: var(--author); }
  .expando { width: 22px; height: 18px; border: 1px solid var(--pill-line); background: var(--pill); color: var(--pill-ink); border-radius: 2px; font-size: 10px; line-height: 1; cursor: pointer; margin-right: 4px; padding: 0; }
  .expando:hover { border-color: var(--brand); color: var(--brand); }
  .expando.open { background: var(--surface); }
  .buttons { list-style: none; margin: 2px 0 0; padding: 0; display: flex; gap: 8px; font-size: 10px; flex-wrap: wrap; }
  .buttons a, .buttons button { color: var(--meta); font-weight: 700; background: none; border: 0; padding: 1px 0; font: inherit; font-weight: 700; cursor: pointer; text-decoration: none; }
  .buttons a:hover, .buttons button:hover { text-decoration: underline; color: var(--meta-strong); }
  .post.classic .inline { grid-column: 3 / -1; margin: 8px 0 4px; }

  @media (max-width: 899px) {
    .post { border-radius: 0; border-left: 0; border-right: 0; margin-bottom: 6px; padding: 12px 14px; box-shadow: none; }
    .post.card .preview { margin-left: -14px; margin-right: -14px; width: calc(100% + 28px); border-radius: 0; }
    .post.card .inline { margin-left: -14px; margin-right: -14px; }
    .post.classic { grid-template-columns: 0 34px 56px minmax(0, 1fr); padding: 8px 10px 8px 0; background: var(--surface); margin: 0; }
    .rank { visibility: hidden; }
    .post.classic :global(.cover) { width: 56px !important; height: 56px !important; }
    .post.classic .inline { grid-column: 1 / -1; margin-left: -0px; }
  }
</style>
