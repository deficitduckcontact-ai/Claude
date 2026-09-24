<script lang="ts">
  import { session } from '$lib/session.svelte';
  let email = $state(''); let msg = $state(''); let err = $state('');
  async function send(e: SubmitEvent) { e.preventDefault(); err = ''; try { await session.resetPassword(email); msg = 'Check your inbox for a reset link.'; } catch (x) { err = (x as Error).message; } }
</script>
<svelte:head><title>Reset password — TinyCoup</title><meta name="robots" content="noindex" /></svelte:head>
<div class="card" style="max-width:420px;margin:40px auto;padding:28px">
  <h1 style="margin-top:0">Reset password</h1>
  {#if msg}<p>{msg}</p>{:else}
  <form onsubmit={send}>
    <div class="field"><label for="e">Email</label><input id="e" class="input" type="email" bind:value={email} required /></div>
    {#if err}<div class="error">{err}</div>{/if}
    <button class="btn primary block">Send reset link</button>
  </form>{/if}
</div>
