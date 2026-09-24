<script lang="ts">
  // Old-reddit threaded comments: [–] collapse, indentation lines, reply, permalink.
  import { avatarArt } from '$lib/art';
  import { commentGate, listComments, postComment, reportComment, REPORT_REASONS } from '$lib/api';
  import { session } from '$lib/session.svelte';
  import { agoText } from '$lib/time';
  import type { Comment } from '$lib/types';

  let { slug, id }: { slug: string; id: string } = $props();
  let items = $state<Comment[]>([]);
  let body = $state('');
  let replyTo = $state<string | null>(null);
  let replyBody = $state('');
  let collapsed = $state<string[]>([]);
  let err = $state('');
  let busy = $state(false);
  let sort = $state<'best' | 'new' | 'old'>('old');
  let reporting = $state<string | null>(null);
  let reported = $state<string[]>([]);
  let notice = $state('');
  const gate = $derived(commentGate());
  // Held comments (spam filter / 3+ reports) are visible only to their author until reviewed.
  const shown = $derived(items.filter((c) => c.status !== 'held' || c.uid === session.account?.uid));

  $effect(() => { if (session.ready) listComments(slug, id).then((c) => (items = c)); });

  const kids = $derived.by(() => {
    const m = new Map<string, Comment[]>();
    for (const c of shown) {
      const k = c.parentId && shown.some((p) => p.id === c.parentId) ? c.parentId : '';
      m.set(k, [...(m.get(k) ?? []), c]);
    }
    const order = (a: Comment, b: Comment) => (sort === 'new' ? b.createdAt - a.createdAt : sort === 'old' ? a.createdAt - b.createdAt : (m.get(b.id)?.length ?? 0) - (m.get(a.id)?.length ?? 0));
    for (const list of m.values()) list.sort(order);
    return m;
  });
  const count = (cid: string): number => (kids.get(cid) ?? []).reduce((n, c) => n + 1 + count(c.id), 0);

  async function send(parentId?: string) {
    err = ''; busy = true;
    try {
      const c = await postComment(slug, id, parentId ? replyBody : body, parentId);
      items = [...items, c];
      notice = c.status === 'held' ? 'Your comment is waiting for a quick review before others can see it.' : '';
      if (parentId) { replyBody = ''; replyTo = null; } else body = '';
    } catch (x) { err = (x as Error).message; }
    busy = false;
  }
  async function report(cid: string, reason: keyof typeof REPORT_REASONS) {
    try { await reportComment(slug, id, cid, reason); reported = [...reported, cid]; } catch (x) { err = (x as Error).message; }
    reporting = null;
  }
  const toggleCollapse = (cid: string) => (collapsed = collapsed.includes(cid) ? collapsed.filter((x) => x !== cid) : [...collapsed, cid]);
  // TODO: likes on comments, creator-highlighted comments, report/moderation queue, rate limiting via a callable.
</script>

{#snippet thread(list: Comment[], depth: number)}
  {#each list as c (c.id)}
    {@const shut = collapsed.includes(c.id)}
    <div class="c" id="c-{c.id}" class:odd={depth % 2 === 1}>
      <p class="tagline">
        <button class="exp" onclick={() => toggleCollapse(c.id)} aria-label={shut ? 'Expand' : 'Collapse'}>[{shut ? '+' : '–'}]</button>
        <img src={avatarArt(c.handle)} alt="" width="16" height="16" />
        <a class="au" href="/u/{c.handle}">{c.handle}</a>
        <span class="faint">{agoText(c.createdAt, session.now)}</span>
        {#if c.status === 'held'}<span class="held">awaiting review · only you can see this</span>{/if}
        {#if shut}<span class="faint">({count(c.id) + 1} comment{count(c.id) ? 's' : ''})</span>{/if}
      </p>
      {#if !shut}
        <div class="md">{c.body}</div>
        <ul class="buttons">
          <li><a href="#c-{c.id}">permalink</a></li>
          {#if gate.ok && depth < 8}<li><button onclick={() => { replyTo = replyTo === c.id ? null : c.id; replyBody = ''; }}>reply</button></li>{/if}
          {#if session.account && c.uid !== session.account.uid}
            <li>{#if reported.includes(c.id)}<span class="faint">reported — thanks</span>{:else}<button onclick={() => (reporting = reporting === c.id ? null : c.id)}>report</button>{/if}</li>
          {/if}
        </ul>
        {#if reporting === c.id}
          <div class="rep">why? {#each Object.entries(REPORT_REASONS) as [k, label]}<button onclick={() => report(c.id, k as keyof typeof REPORT_REASONS)}>{label}</button>{/each}</div>
        {/if}
        {#if replyTo === c.id}
          <form class="reply" onsubmit={(e) => { e.preventDefault(); send(c.id); }}>
            <textarea class="input" bind:value={replyBody} maxlength="4000" placeholder="Reply to {c.handle}…"></textarea>
            <div class="row"><button class="btn primary small" disabled={busy || !replyBody.trim()}>save</button><button type="button" class="btn small" onclick={() => (replyTo = null)}>cancel</button></div>
          </form>
        {/if}
        {#if kids.get(c.id)?.length}<div class="child">{@render thread(kids.get(c.id)!, depth + 1)}</div>{/if}
      {/if}
    </div>
  {/each}
{/snippet}

<section id="comments" class="cm">
  <div class="row head">
    <h2 class="grow">{items.length ? `all ${items.length} comment${items.length === 1 ? '' : 's'}` : 'comments'}</h2>
    <label class="faint">sorted by:
      <select bind:value={sort}><option value="old">old</option><option value="new">new</option><option value="best">most replies</option></select>
    </label>
  </div>
  {#if gate.ok}
    <form onsubmit={(e) => { e.preventDefault(); send(); }}>
      <textarea class="input" bind:value={body} placeholder="Say something nice…" maxlength="4000"></textarea>
      <button class="btn primary" disabled={busy || !body.trim()}>save</button>
      <span class="faint rules">Be kind. <a href="/legal/rules" class="lnk">Community rules</a></span>
    </form>
  {:else if gate.reason === 'login'}
    <p class="gate"><a href="/login?next=/s/{slug}/{id}%23comments" class="lnk">Log in</a> or <a href="/signup" class="lnk">sign up</a> to join the conversation.</p>
  {:else if gate.reason === 'verify'}
    <p class="gate">Verify your email to comment. <a href="/me/settings" class="lnk">Resend the link</a></p>
  {:else}
    <p class="gate">💬 Comments are for supporters — it keeps them friendly and spam-free. <a href="/subscribe" class="lnk">Back an artist from $2.49</a> to join in.</p>
  {/if}
  {#if notice}<div class="notice">{notice}</div>{/if}
  {#if err}<div class="error">{err}</div>{/if}
  <div class="list">
    {@render thread(kids.get('') ?? [], 0)}
    {#if !shown.length}<p class="faint">No comments yet. Be the first.</p>{/if}
  </div>
</section>

<style>
  .cm { margin-top: 22px; font-family: var(--classic); }
  .head { border-bottom: 1px dotted var(--line-strong); padding-bottom: 4px; margin-bottom: 10px; }
  h2 { font-size: 14px; margin: 0; font-weight: 400; text-transform: lowercase; }
  .head label { font-size: 11px; } .head select { font: inherit; border: 0; background: none; color: var(--link); font-weight: 700; cursor: pointer; }
  form { display: flex; flex-direction: column; gap: 6px; align-items: flex-start; margin-bottom: 14px; max-width: 560px; }
  form textarea { font-family: var(--sans); }
  .c { margin: 8px 0 0; }
  .child { margin-left: 14px; padding-left: 10px; border-left: 1px dotted var(--line); }
  .c.odd > .child { border-left-color: var(--pill-line); }
  .tagline { margin: 0; font-size: 10.5px; display: flex; align-items: center; gap: 5px; color: var(--meta); }
  .tagline img { border-radius: 99px; }
  .exp { border: 0; background: none; font: inherit; color: var(--meta); padding: 0; cursor: pointer; font-family: monospace; }
  .exp:hover { color: var(--brand); }
  .au { color: var(--author); font-weight: 700; }
  .md { font-family: var(--sans); font-size: 14px; margin: 3px 0 2px; white-space: pre-wrap; line-height: 1.45; color: var(--ink); }
  .buttons { list-style: none; margin: 0; padding: 0; display: flex; gap: 8px; font-size: 10px; }
  .buttons a, .buttons button { color: var(--meta); font: inherit; font-weight: 700; background: none; border: 0; padding: 0; cursor: pointer; text-decoration: none; }
  .buttons a:hover, .buttons button:hover { text-decoration: underline; }
  .reply { margin: 6px 0 0; }
  .lnk { color: var(--link); font-weight: 600; }
  .gate { font-family: var(--sans); font-size: 13.5px; background: var(--surface-2); border: 1px solid var(--line); border-radius: 6px; padding: 10px 12px; color: var(--ink-2); }
  .notice { font-family: var(--sans); font-size: 13px; background: var(--cream); border: 1px solid var(--cream-line); border-radius: 6px; padding: 8px 12px; margin-bottom: 10px; color: var(--ink-2); }
  .held { background: var(--cream); color: var(--ink-3); border-radius: 3px; padding: 0 5px; }
  .rules { font-size: 11px; }
  .rep { font-size: 11px; display: flex; flex-wrap: wrap; gap: 4px; margin: 4px 0; color: var(--ink-4); align-items: center; }
  .rep button { font: inherit; border: 1px solid var(--line); background: var(--surface); border-radius: 3px; padding: 1px 6px; cursor: pointer; color: var(--ink-2); }
  .rep button:hover { border-color: var(--heart); color: var(--heart); }
  @media (max-width: 899px) { .cm { padding: 0 14px; } .child { margin-left: 6px; padding-left: 8px; } }
</style>
