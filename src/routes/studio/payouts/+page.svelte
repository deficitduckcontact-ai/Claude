<script lang="ts">
  import RequireAuth from '$lib/components/RequireAuth.svelte';
  import { LIVE } from '$lib/firebase';
  import { money, split, PER_ARTIST_CENTS } from '$lib/pricing';

  // Worked example so creators can see exactly how a reader's payment splits.
  const example = split(4 * PER_ARTIST_CENTS, [
    { slug: 'yours', creatorUids: ['you'] }, { slug: 'b', creatorUids: ['b'] }, { slug: 'c', creatorUids: ['c'] }, { slug: 'd', creatorUids: ['d1', 'd2'] }
  ]);
</script>

<svelte:head><title>Payouts — TinyCoup</title></svelte:head>

<RequireAuth creator>
  <div class="shell narrow pad-m">
    <h1>Payouts</h1>
    <div class="card pad">
      <h3>How you get paid</h3>
      <p>Every time a reader who picked you is billed, your share is sent to your Stripe account (Connect Express). Stripe pays out to your bank on its normal schedule.</p>
      <h4>Example: a reader backs 4 artists ({money(example.grossCents)}/mo)</h4>
      <table><tbody>
        <tr><td>Reader pays</td><td>{money(example.grossCents)}</td></tr>
        <tr><td>Creator pool (85%)</td><td>{money(example.creatorPoolCents)}</td></tr>
        <tr><td><b>You (1 of 4 picks)</b></td><td><b>{money(example.perCreator.you)}</b></td></tr>
        <tr><td>A two-person series splits its share</td><td>{money(example.perCreator.d1)} each</td></tr>
        <tr><td>Card fee (paid by TinyCoup)</td><td>{money(example.feeCents)}</td></tr>
        <tr><td>TinyCoup keeps</td><td>{money(example.platformNetCents)}</td></tr>
      </tbody></table>
    </div>
    <div class="card pad" style="margin-top:14px">
      <h3>Statements</h3>
      {#if LIVE}
        <div class="todo-box"><b>TODO:</b> list <code>ledger</code> rows where creatorUid == you (rules already allow it), monthly totals, CSV export, and a “Stripe dashboard” login link (accounts.createLoginLink).</div>
      {:else}
        <p class="muted">No payouts in demo mode.</p>
      {/if}
    </div>
  </div>
</RequireAuth>

<style>
  h3 { margin: 0 0 8px; font-size: 15px; } h4 { font-size: 13px; margin: 16px 0 6px; color: var(--ink-3); }
  p { font-size: 14px; line-height: 1.55; }
  table { width: 100%; border-collapse: collapse; font-size: 14px; }
  td { padding: 7px 0; border-top: 1px solid var(--line); } td:last-child { text-align: right; font-variant-numeric: tabular-nums; }
</style>
