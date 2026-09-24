<script lang="ts">
  import RequireAuth from '$lib/components/RequireAuth.svelte';
  import { session } from '$lib/session.svelte';
  import { cancelDemo, openBillingPortal } from '$lib/api';
  import { LIVE } from '$lib/firebase';
  import { money, quote } from '$lib/pricing';
  import { longDate } from '$lib/time';

  let busy = $state(false);
  let err = $state('');
  const q = $derived(quote(session.sub.picks.length));
  async function portal() {
    busy = true; err = '';
    try { const url = await openBillingPortal(); if (url.startsWith('http')) location.href = url; /* demo: already on billing */ } catch (e) { err = (e as Error).message; }
    busy = false;
  }
</script>

<svelte:head><title>Billing — TinyCoup</title><meta name="robots" content="noindex" /></svelte:head>

<RequireAuth>
  <div class="shell narrow pad-m">
    <h1>Billing</h1>
    <div class="card pad">
      {#if session.subscribed}
        <div class="row"><div class="grow"><b>{session.sub.picks.length} artist subscription{session.sub.picks.length === 1 ? '' : 's'}</b>
          <div class="muted">{money(q.monthlyCents)} / month{#if session.sub.currentPeriodEnd} · renews {longDate(session.sub.currentPeriodEnd)}{/if}</div></div>
          <span class="chip ok">{session.sub.status === 'past_due' ? 'Payment failed' : 'Active'}</span></div>
        {#if session.sub.status === 'past_due'}<p class="error">Your last payment failed. Update your card to keep premium access.</p>{/if}
        <table>
          <tbody>
            <tr><td>To your artists (85%)</td><td>{money(q.creatorsCents)}</td></tr>
            <tr><td>Card processing (est.)</td><td>{money(q.feeCents)}</td></tr>
            <tr><td>TinyCoup</td><td>{money(q.platformNetCents)}</td></tr>
          </tbody>
        </table>
        <div class="row" style="flex-wrap:wrap">
          <button class="btn primary" onclick={portal} disabled={busy}>Update card & invoices</button>
          <a class="btn" href="/me/plan">Change artists</a>
          {#if !LIVE}<button class="btn ghost" onclick={cancelDemo}>Cancel (demo)</button>{/if}
        </div>
        {#if err}<p class="error">{err}</p>{/if}
      {:else if session.sub.status === 'canceled'}
        <p>Your subscription is cancelled. Thanks for backing artists while you did.</p>
        <a class="btn primary" href="/subscribe">Resubscribe</a>
      {:else}
        <p>You're a free reader. No card on file.</p>
        <a class="btn primary" href="/subscribe">Pick artists</a>
      {/if}
    </div>
    {#if !LIVE}
      <div class="todo-box" style="margin-top:14px"><b>Demo mode:</b> in live mode, “Update card & invoices” opens the Stripe Customer Portal (update card, download invoices, cancel). Cancelling there fires a webhook that flips your subscription doc.</div>
    {/if}
  </div>
</RequireAuth>

<style>
  table { width: 100%; border-collapse: collapse; margin: 14px 0; font-size: 14px; }
  td { padding: 7px 0; border-top: 1px solid var(--line); } td:last-child { text-align: right; font-variant-numeric: tabular-nums; }
</style>
