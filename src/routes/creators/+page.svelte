<script lang="ts">
  import { joinWaitlist } from '$lib/api';
  import { money, quote, PER_ARTIST_CENTS, CREATOR_SHARE } from '$lib/pricing';
  let backers = $state(300);
  let email = $state(''); let msg = $state(''); let err = $state('');
  const monthly = $derived(Math.round(backers * PER_ARTIST_CENTS * CREATOR_SHARE));
  async function join(e: SubmitEvent) { e.preventDefault(); err = ''; try { await joinWaitlist(email, true); msg = "Thanks! We'll be in touch."; } catch (x) { err = (x as Error).message; } }
</script>

<svelte:head><title>For creators — TinyCoup</title></svelte:head>

<div class="hero">
  <h1>Readers back <em>you</em>. You keep 85%.</h1>
  <p class="serif-it">No tiers, no pool nobody can explain. A reader picks you and you get paid.</p>
  <a class="btn primary big" href="/studio">Open the creator studio</a>
</div>

<div class="shell narrow pad-m">
  <div class="card pad">
    <h2>What {backers} backers is worth</h2>
    <input type="range" min="10" max="5000" step="10" bind:value={backers} aria-label="Backers" />
    <div class="big">{money(monthly)}<small>/month</small></div>
    <p class="muted">{backers} × {money(PER_ARTIST_CENTS)} × 85%. Card fees come out of our 15%, not yours.</p>
  </div>

  <div class="grid">
    <div class="card pad"><h3>Non-exclusive</h3><p>Post your comics anywhere else too. You keep your rights and can leave with your archive whenever you want.</p></div>
    <div class="card pad"><h3>Made for comics</h3><p>Upload full-size masters. We serve retina-sharp 1600px AVIF and a light 800px version, cached worldwide.</p></div>
    <div class="card pad"><h3>Real pages</h3><p>Every episode is its own indexable page with a proper link preview, so shares actually bring people in.</p></div>
    <div class="card pad"><h3>Stripe payouts</h3><p>Connect Express handles identity checks, tax forms and bank payouts in 40+ countries.</p></div>
  </div>

  <div class="card pad">
    <h3>Joining at launch?</h3>
    {#if msg}<p>{msg}</p>{:else}
      <form class="row" onsubmit={join}><input class="input" type="email" placeholder="you@studio.com" bind:value={email} required /><button class="btn primary">Keep me posted</button></form>
      {#if err}<p class="error">{err}</p>{/if}
    {/if}
  </div>
  <p class="faint" style="font-size:12px">A single $2.49 pick nets TinyCoup {money(Math.max(0, quote(1).platformNetCents))} after card fees. We're not in this for the margin.</p>
</div>

<style>
  .hero { text-align: center; padding: 56px 20px 40px; background: linear-gradient(var(--mint), var(--page)); }
  .hero h1 { font-size: clamp(28px, 5vw, 44px); margin: 0 auto 10px; max-width: 18ch; line-height: 1.1; }
  .hero em { font-style: normal; color: var(--coup); }
  .hero p { color: var(--ink-3); font-size: 18px; margin: 0 0 20px; }
  h2 { margin: 0 0 10px; font-size: 18px; } h3 { margin: 0 0 6px; font-size: 15px; }
  input[type='range'] { width: 100%; accent-color: var(--coup); }
  .big { font-size: 40px; font-weight: 800; color: var(--ok); } .big small { font-size: 16px; color: var(--ink-3); font-weight: 500; }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; margin: 14px 0; }
  .grid p { margin: 0; font-size: 14px; color: var(--ink-3); line-height: 1.5; }
</style>
