<script lang="ts">
  import { avatarArt } from '$lib/art';
  import { listComments, postComment } from '$lib/api';
  import { session } from '$lib/session.svelte';
  import { ago } from '$lib/time';
  import type { Comment } from '$lib/types';

  let { slug, id }: { slug: string; id: string } = $props();
  let items = $state<Comment[]>([]);
  let body = $state('');
  let err = $state('');
  let busy = $state(false);

  $effect(() => { if (session.ready) listComments(slug, id).then((c) => (items = c)); });

  async function send(e: SubmitEvent) {
    e.preventDefault(); err = ''; busy = true;
    try { items = [...items, await postComment(slug, id, body)]; body = ''; }
    catch (x) { err = (x as Error).message; }
    busy = false;
  }
  // TODO: replies (parentId), creator-highlighted comments, report/moderation queue, rate limiting via a callable.
</script>

<section id="comments" class="cm">
  <h2>Comments</h2>
  {#if session.account}
    <form onsubmit={send}>
      <textarea class="input" bind:value={body} placeholder="Say something nice…" maxlength="4000"></textarea>
      {#if err}<div class="error">{err}</div>{/if}
      <button class="btn primary" disabled={busy || !body.trim()}>Post</button>
    </form>
  {:else}
    <p class="muted"><a href="/login?next=/s/{slug}/{id}%23comments" class="lnk">Log in</a> to comment.</p>
  {/if}
  {#each items as c (c.id)}
    <div class="c">
      <img src={avatarArt(c.handle)} alt="" width="30" height="30" />
      <div><div class="h"><b>{c.handle}</b> <span class="faint">{ago(c.createdAt, session.now)}</span></div><p>{c.body}</p></div>
    </div>
  {:else}
    <p class="faint">No comments yet. Be the first.</p>
  {/each}
</section>

<style>
  .cm { margin-top: 26px; }
  h2 { font-size: 18px; margin: 0 0 10px; }
  form { display: flex; flex-direction: column; gap: 8px; align-items: flex-end; margin-bottom: 16px; }
  .c { display: flex; gap: 10px; padding: 10px 0; border-top: 1px solid var(--line); }
  .c img { border-radius: 99px; flex: 0 0 auto; }
  .h { font-size: 13px; } p { margin: 3px 0 0; font-size: 14.5px; white-space: pre-wrap; }
  .lnk { color: var(--coup); font-weight: 600; }
  @media (max-width: 899px) { .cm { padding: 0 14px; } }
</style>
