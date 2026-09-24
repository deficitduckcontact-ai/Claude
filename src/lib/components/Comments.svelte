<script lang="ts">
  // Threaded comments (new-reddit style): avatar, name · time, body, action pills, thread lines.
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
        <img src={avatarArt(c.handle)} alt="" width="26" height="26" />
        <a class="au" href="/u/{c.handle}">{c.handle}</a>
        <span class="faint">· {agoText(c.createdAt, session.now)}</span>
        {#if c.status === 'held'}<span class="held">Awaiting review · only you can see this</span>{/if}
        {#if shut}<span class="faint">· {count(c.id) + 1} hidden</span>{/if}
        <button class="exp" onclick={() => toggleCollapse(c.id)} aria-label={shut ? 'Expand thread' : 'Collapse thread'}>{shut ? '+' : '−'}</button>
      </p>
      {#if !shut}
        <div class="md">{c.body}</div>
        <ul class="buttons">
          {#if gate.ok && depth < 8}<li><button onclick={() => { replyTo = replyTo === c.id ? null : c.id; replyBody = ''; }}>💬 Reply</button></li>{/if}
          <li><a href="#c-{c.id}">Link</a></li>
          {#if session.account && c.uid !== session.account.uid}
            <li>{#if reported.includes(c.id)}<span class="faint">Reported — thanks</span>{:else}<button onclick={() => (reporting = reporting === c.id ? null : c.id)}>Report</button>{/if}</li>
          {/if}
        </ul>
        {#if reporting === c.id}
          <div class="rep">Why are you reporting this? {#each Object.entries(REPORT_REASONS) as [k, label]}<button onclick={() => report(c.id, k as keyof typeof REPORT_REASONS)}>{label}</button>{/each}</div>
        {/if}
        {#if replyTo === c.id}
          <form class="reply" onsubmit={(e) => { e.preventDefault(); send(c.id); }}>
            <textarea class="input" bind:value={replyBody} maxlength="4000" placeholder="Reply to {c.handle}…"></textarea>
            <div class="row"><button type="button" class="btn small" onclick={() => (replyTo = null)}>Cancel</button><button class="btn primary small" disabled={busy || !replyBody.trim()}>Reply</button></div>
          </form>
        {/if}
        {#if kids.get(c.id)?.length}<div class="child">{@render thread(kids.get(c.id)!, depth + 1)}</div>{/if}
      {/if}
    </div>
  {/each}
{/snippet}

<section id="comments" class="cm">
  <div class="row head">
    <h2 class="grow">Comments <span class="faint">{shown.length || ''}</span></h2>
    <label class="faint">Sort by
      <select bind:value={sort}><option value="old">Oldest</option><option value="new">Newest</option><option value="best">Most replies</option></select>
    </label>
  </div>
  {#if gate.ok}
    <form onsubmit={(e) => { e.preventDefault(); send(); }}>
      <textarea class="input" bind:value={body} placeholder="Add a comment…" maxlength="4000"></textarea>
      <div class="row fr"><span class="faint rules">Be kind. <a href="/legal/rules" class="lnk">Community rules</a></span><span class="grow"></span>
      <button class="btn primary" disabled={busy || !body.trim()}>Comment</button></div>
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
  .cm { margin-top: 26px; }
  .head { padding-bottom: 8px; margin-bottom: 12px; border-bottom: 1px solid var(--line); }
  h2 { font-size: 18px; margin: 0; }
  .head label { font-size: 13px; } .head select { font: inherit; border: 0; background: none; color: var(--ink); font-weight: 600; cursor: pointer; }
  form { display: flex; flex-direction: column; gap: 8px; margin-bottom: 18px; background: var(--surface); border: 1px solid var(--line); border-radius: 14px; padding: 8px; }
  form:focus-within { border-color: var(--brand); box-shadow: 0 0 0 3px var(--brand-ring); }
  form textarea { border: 0; box-shadow: none !important; min-height: 70px; background: transparent; }
  .fr { padding: 0 4px 2px; }
  .c { margin: 14px 0 0; }
  .child { margin-left: 12px; padding-left: 18px; border-left: 2px solid var(--line); }
  .child:hover { border-left-color: var(--line-strong); }
  .tagline { margin: 0; font-size: 13px; display: flex; align-items: center; gap: 6px; }
  .tagline img { border-radius: 99px; }
  .exp { margin-left: auto; width: 22px; height: 22px; border-radius: 99px; border: 1px solid var(--line); background: var(--surface); color: var(--ink-3); cursor: pointer; font-size: 14px; line-height: 1; padding: 0; }
  .exp:hover { color: var(--brand); border-color: var(--brand); }
  .au { color: var(--ink); font-weight: 700; }
  .md { font-size: 14.5px; margin: 4px 0 2px 32px; white-space: pre-wrap; line-height: 1.5; color: var(--ink); }
  .buttons { list-style: none; margin: 2px 0 0 26px; padding: 0; display: flex; gap: 2px; }
  .buttons a, .buttons button, .buttons span { display: inline-flex; align-items: center; height: 28px; padding: 0 10px; border-radius: 99px; color: var(--ink-3); font-size: 12.5px; font-weight: 600; background: none; border: 0; cursor: pointer; text-decoration: none !important; }
  .buttons a:hover, .buttons button:hover { background: var(--surface-3); color: var(--ink); }
  .reply { margin: 6px 0 0 32px; }
  .lnk { color: var(--brand); font-weight: 600; }
  .gate { font-size: 14px; background: var(--brand-tint); border: 1px solid var(--line); border-radius: 12px; padding: 12px 14px; color: var(--ink-2); }
  .notice { font-size: 13.5px; background: var(--cream); border: 1px solid var(--cream-line); border-radius: 12px; padding: 10px 14px; margin-bottom: 12px; color: var(--ink-2); }
  .held { background: var(--cream); color: var(--ink-3); border-radius: 99px; padding: 1px 8px; font-size: 11.5px; }
  .rules { font-size: 12px; }
  .rep { font-size: 12.5px; display: flex; flex-wrap: wrap; gap: 6px; margin: 6px 0 0 32px; color: var(--ink-3); align-items: center; }
  .rep button { font: inherit; border: 1px solid var(--line); background: var(--surface); border-radius: 99px; padding: 3px 10px; cursor: pointer; color: var(--ink-2); }
  .rep button:hover { border-color: var(--heart); color: var(--heart); }
  @media (max-width: 899px) { .cm { padding: 0 14px; } .child { margin-left: 4px; padding-left: 12px; } }
</style>
