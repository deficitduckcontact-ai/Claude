<script lang="ts">
  // Stripe Checkout success_url lands here. The webhook (not this page) is what
  // actually activates the subscription; we just wait for the doc to flip.
  import Cover from '$lib/components/Cover.svelte';
  import { session } from '$lib/session.svelte';
  import { getSeries, creatorLine } from '$lib/data';
  import { money, quote } from '$lib/pricing';
  import { longDate } from '$lib/time';

  const picks = $derived(session.sub.picks.map(getSeries).filter((s) => !!s));
  const q = $derived(quote(picks.length));
</script>

<svelte:head><title>You're subscribed — TinyCoup</title></svelte:head>

<div class="shell narrow pad-m">
  <div class="card done">
    {#if !session.ready || !session.subscribed}
      <p class="faint">Confirming your payment with Stripe…</p>
    {:else}
      <div class="ring"><svg viewBox="0 0 24 24"><path d="M4 12.5l5 5L20 6.5" stroke-linecap="round" stroke-linejoin="round" /></svg></div>
      <h2>You're backing {picks.length} artist{picks.length === 1 ? '' : 's'}.</h2>
      <p class="muted">Every premium comic is unlocked. Here's where your money goes each month:</p>
      <div class="chips">
        {#each picks as s, i (s.slug)}<span class="c" style="--i:{i}"><Cover series={s} size={22} radius={99} />{s.title}<small class="faint">· {creatorLine(s)}</small></span>{/each}
      </div>
      <div class="receipt">
        <b>Monthly:</b> {money(q.monthlyCents)}{#if session.sub.currentPeriodEnd} · next on {longDate(session.sub.currentPeriodEnd)}{/if}<br />
        <b>To artists:</b> {money(q.creatorsCents)} (≈ {money(q.perArtistToCreatorCents)} each)<br />
        <b>To TinyCoup:</b> {money(q.monthlyCents - q.creatorsCents)}, which also covers the card fee ({money(q.feeCents)})
      </div>
      <div class="row" style="justify-content:center"><a class="btn primary big" href="/">Start reading</a><a class="btn big" href="/me/plan">Change artists</a></div>
    {/if}
  </div>
</div>

<style>
  .done { padding: 46px 30px 40px; text-align: center; margin-top: 20px; }
  .ring { width: 62px; height: 62px; border-radius: 99px; background: var(--mint); display: grid; place-items: center; margin: 0 auto 16px; animation: ringIn 0.42s cubic-bezier(0.2, 0.9, 0.3, 1) both; }
  .ring svg { width: 28px; height: 28px; stroke: var(--ok); stroke-width: 3; fill: none; }
  .ring path { stroke-dasharray: 32; stroke-dashoffset: 32; animation: draw 0.5s 0.18s cubic-bezier(0.4, 0, 0.2, 1) forwards; }
  @keyframes ringIn { from { opacity: 0; transform: scale(0.72); } }
  @keyframes draw { to { stroke-dashoffset: 0; } }
  h2 { margin: 0 0 8px; font-size: 24px; }
  .chips { display: flex; flex-wrap: wrap; gap: 7px; justify-content: center; margin: 18px auto 22px; }
  .c { display: flex; align-items: center; gap: 7px; border: 1px solid var(--line); border-radius: 99px; padding: 5px 12px 5px 5px; font-size: 12.5px; animation: rise 0.32s both; animation-delay: calc(0.2s + var(--i) * 38ms); }
  @keyframes rise { from { opacity: 0; transform: translateY(8px); } }
  .receipt { background: var(--cream); border: 1px solid var(--cream-line); border-radius: 12px; padding: 14px 16px; max-width: 520px; margin: 0 auto 20px; font-size: 13.5px; text-align: left; line-height: 1.7; }
</style>
