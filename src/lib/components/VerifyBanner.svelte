<script lang="ts">
  import { page } from '$app/state';
  import { session } from '$lib/session.svelte';
  let msg = $state('');
  let busy = $state(false);
  async function go() { busy = true; try { msg = (await session.verifyEmail()) ?? ''; } catch (e) { msg = (e as Error).message; } busy = false; }
  const hide = $derived(['/login', '/signup'].includes(page.url.pathname));
</script>

{#if session.account && !session.account.emailVerified && !hide}
  <div class="vb" role="status">
    <span>📧 Check <b>{session.account.email}</b> for a link to verify your email. You'll need it to comment.</span>
    <button onclick={go} disabled={busy}>I've verified / resend</button>
    {#if msg}<span class="m">{msg}</span>{/if}
  </div>
{/if}

<style>
  .vb { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; justify-content: center; padding: 7px 14px; background: var(--cream); border-bottom: 1px solid var(--cream-line); font-size: 13px; color: var(--ink-2); }
  button { border: 1px solid var(--cream-line); background: var(--surface); border-radius: 6px; padding: 3px 10px; font: inherit; cursor: pointer; color: var(--ink-2); }
  .m { color: var(--ok); font-weight: 600; }
</style>
