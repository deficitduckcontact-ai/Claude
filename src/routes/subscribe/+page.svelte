<script lang="ts">
  import { goto } from '$app/navigation';
  import ArtistPicker from '$lib/components/ArtistPicker.svelte';
  import { session } from '$lib/session.svelte';
  import { joinWaitlist, startCheckout } from '$lib/api';
  import { on } from '$lib/features';

  let initial = $state<string[] | null>(null);
  let busy = $state(false);
  let error = $state('');
  let waitlisted = $state(false);

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
    if (!on('payments')) {
      // Preview site: no charge, just remember they're interested.
      try { await joinWaitlist(session.account.email, false); waitlisted = true; } catch (e) { error = (e as Error).message; }
      busy = false;
      return;
    }
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
  {#if waitlisted}
    <div class="card pad soon"><b>You're on the list.</b> Subscriptions open at launch. We'll email {session.account?.email} the moment you can back these artists. No charge until then.</div>
  {:else if !on('payments')}
    <div class="card pad soon"><b>Preview:</b> subscriptions open at launch. Pick the artists you'd back and we'll let you know when it's live. Nothing is charged.</div>
  {/if}
  {#if initial}
    <ArtistPicker {initial} mode="new" {busy} {error} onconfirm={confirm} oncancel={() => history.length > 1 ? history.back() : goto('/')} />
  {/if}
  <p class="fine faint">Billed monthly by Stripe as one charge. Change artists or cancel any time from <a href="/me/billing">Billing</a>.
    <!-- TODO(billing): annual plan toggle (one charge a year = far lower card fees) --></p>
</div>

<style>
  .wrap { max-width: 1000px; margin: 20px auto; padding: 0 16px; }
  .soon { margin-bottom: 12px; background: var(--brand-tint); border-color: var(--line); font-size: 14px; }
  .fine { font-size: 12px; text-align: center; margin-top: 12px; }
  @media (max-width: 899px) { .wrap { margin: 0; padding: 0 0 calc(var(--bottom-nav) + 20px); } }
</style>
