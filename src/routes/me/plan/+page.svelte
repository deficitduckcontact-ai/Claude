<script lang="ts">
  import { goto } from '$app/navigation';
  import RequireAuth from '$lib/components/RequireAuth.svelte';
  import ArtistPicker from '$lib/components/ArtistPicker.svelte';
  import { session } from '$lib/session.svelte';
  import { updatePicks } from '$lib/api';

  let busy = $state(false);
  let error = $state('');
  let saved = $state(false);
  $effect(() => { if (session.ready && session.account && !session.subscribed) goto('/subscribe', { replaceState: true }); });

  async function save(picks: string[]) {
    busy = true; error = ''; saved = false;
    try { await updatePicks(picks); saved = true; } catch (e) { error = (e as Error).message; }
    busy = false;
  }
</script>

<svelte:head><title>My artists — TinyCoup</title><meta name="robots" content="noindex" /></svelte:head>

<RequireAuth>
  {#if session.subscribed}
    <div class="wrap">
      {#if saved}<div class="card pad ok">✓ Saved. Your next invoice reflects the change (prorated from today).</div>{/if}
      {#key session.sub.picks.join()}
        <ArtistPicker initial={session.sub.picks} mode="manage" {busy} {error} onconfirm={save} />
      {/key}
      <p class="fine faint">Card, invoices and cancelling live in <a href="/me/billing">Billing</a>.</p>
    </div>
  {/if}
</RequireAuth>

<style>
  .wrap { max-width: 1000px; margin: 20px auto; padding: 0 16px; }
  .ok { background: var(--mint); border-color: #bee8d6; margin-bottom: 12px; color: #0f5e3e; font-weight: 600; }
  .fine { text-align: center; font-size: 12.5px; } .fine a { color: var(--coup); }
  @media (max-width: 899px) { .wrap { margin: 0; padding: 0 0 calc(var(--bottom-nav) + 20px); } }
</style>
