<script lang="ts">
  import { goto } from '$app/navigation';
  import ArtistPicker from '$lib/components/ArtistPicker.svelte';
  import { session } from '$lib/session.svelte';
  import { startCheckout } from '$lib/api';

  let initial = $state<string[] | null>(null);
  let busy = $state(false);
  let error = $state('');

  // Wait for the session (follows) before seeding the picker.
  $effect(() => {
    if (!session.ready || initial) return;
    const qs = new URLSearchParams(location.search);
    const saved = sessionStorage.getItem('tc:pendingPicks');
    const add = qs.get('add');
    const base = saved ? (JSON.parse(saved) as string[]) : session.follows.slice(0, 3);
    initial = add && !base.includes(add) ? [add, ...base] : base;
  });
  $effect(() => { if (session.ready && session.subscribed) goto('/me/plan', { replaceState: true }); });

  async function confirm(picks: string[]) {
    error = '';
    if (!session.account) {
      // Keep their picks through sign-up, then come straight back.
      sessionStorage.setItem('tc:pendingPicks', JSON.stringify(picks));
      return goto('/signup?next=/subscribe');
    }
    busy = true;
    try {
      const url = await startCheckout(picks);
      sessionStorage.removeItem('tc:pendingPicks');
      if (url.startsWith('http')) location.href = url; // Stripe Checkout
      else goto(url);
    } catch (e) { error = (e as Error).message; busy = false; }
  }
</script>

<svelte:head><title>Pick your artists — TinyCoup</title></svelte:head>

<div class="wrap">
  {#if initial}
    <ArtistPicker {initial} mode="new" {busy} {error} onconfirm={confirm} oncancel={() => history.length > 1 ? history.back() : goto('/')} />
  {/if}
  <p class="fine faint">Billed monthly by Stripe as one charge. Change artists or cancel any time from <a href="/me/billing">Billing</a>.
    <!-- TODO(billing): annual plan toggle (one charge a year = far lower card fees) --></p>
</div>

<style>
  .wrap { max-width: 1000px; margin: 20px auto; padding: 0 16px; }
  .fine { font-size: 12px; text-align: center; margin-top: 12px; }
  @media (max-width: 899px) { .wrap { margin: 0; padding: 0 0 calc(var(--bottom-nav) + 20px); } }
</style>
