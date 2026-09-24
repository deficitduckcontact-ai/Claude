<script lang="ts">
  import { money, quote, PER_ARTIST_CENTS } from '$lib/pricing';
  let n = $state(4);
  const q = $derived(quote(n));
</script>

<svelte:head><title>How it works — TinyCoup</title><meta name="description" content="Pick the artists you want to pay. $2.49 each, 85% goes straight to them." /></svelte:head>

<div class="hero">
  <h1>Your subscription goes to <em>people</em>, not a tier.</h1>
  <p class="serif-it">Read free. When you want to support someone, pick them. That's the whole idea.</p>
  <a class="btn primary big" href="/subscribe">Pick your artists</a>
</div>

<div class="shell narrow pad-m">
  <div class="steps">
    <div class="card pad"><div class="num">1</div><h3>Read free</h3><p>Most comics are free, forever. No account needed to read.</p></div>
    <div class="card pad"><div class="num">2</div><h3>Pick artists</h3><p>{money(PER_ARTIST_CENTS)}/month per artist, billed as one payment. Change who you back whenever.</p></div>
    <div class="card pad"><div class="num">3</div><h3>Everything unlocks</h3><p>Any subscription opens every premium comic on the site. Your picks only decide where your money goes.</p></div>
  </div>

  <div class="card pad calc">
    <h2>Where your money goes</h2>
    <label>I'd back <input type="range" min="1" max="12" bind:value={n} /> <b>{n} artist{n === 1 ? '' : 's'}</b></label>
    <div class="bar">
      <span class="a" style:flex={q.creatorsCents}>Artists {money(q.creatorsCents)}</span>
      <span class="f" style:flex={Math.max(q.feeCents, 1)}>Card</span>
      <span class="p" style:flex={Math.max(q.platformNetCents, 1)}>Us</span>
    </div>
    <p class="muted">You pay <b>{money(q.monthlyCents)}</b>/month. <b>{money(q.creatorsCents)}</b> goes to the artists ({money(q.perArtistToCreatorCents)} each). Card processing costs {money(q.feeCents)}, and TinyCoup runs on the remaining {money(Math.max(0, q.platformNetCents))}.</p>
  </div>

  <h2>Questions</h2>
  <details><summary>Why one payment instead of separate ones?</summary><p>Card networks charge about 30¢ per payment. Billing each artist separately would take ~15% of a $2.49 subscription before anyone got paid. One combined charge keeps that under 6% on a typical plan.</p></details>
  <details><summary>Can I change who I back?</summary><p>Any time, from “My artists”. Adding or removing someone is prorated to the day.</p></details>
  <details><summary>Is there an app?</summary><p>TinyCoup is a web app you can add to your home screen. We skip the app stores on purpose: they take 15–30% of subscriptions, which is more than our entire cut.</p></details>
  <details><summary>Who's behind this?</summary><p>A group of webcomic creators and readers. TinyCoup is a working name. <!-- TODO: about/team page --></p></details>
</div>

<style>
  .hero { text-align: center; padding: 56px 20px 40px; background: linear-gradient(var(--cream), var(--page)); }
  .hero h1 { font-size: clamp(28px, 5vw, 44px); margin: 0 auto 10px; max-width: 18ch; line-height: 1.1; }
  .hero em { font-style: normal; color: var(--coup); }
  .hero p { color: var(--ink-3); font-size: 18px; margin: 0 0 20px; }
  .steps { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; }
  .num { width: 28px; height: 28px; border-radius: 99px; background: var(--coup-tint); color: var(--coup-dark); font-weight: 800; display: grid; place-items: center; }
  .steps h3 { margin: 10px 0 4px; font-size: 16px; } .steps p { margin: 0; font-size: 14px; color: var(--ink-3); }
  .calc { margin: 20px 0; } .calc h2 { margin: 0 0 12px; font-size: 18px; }
  .calc label { display: flex; align-items: center; gap: 10px; font-size: 14px; flex-wrap: wrap; }
  .calc input { accent-color: var(--coup); flex: 1; min-width: 140px; }
  .bar { display: flex; height: 34px; border-radius: 8px; overflow: hidden; margin: 14px 0 8px; font-size: 12px; font-weight: 700; color: #fff; }
  .bar span { display: flex; align-items: center; padding: 0 8px; white-space: nowrap; overflow: hidden; min-width: 0; }
  .a { background: var(--ok); } .f { background: #9a9a9a; } .p { background: var(--coup); }
  details { background: #fff; border: 1px solid var(--line); border-radius: 10px; padding: 12px 14px; margin-bottom: 8px; }
  summary { font-weight: 600; cursor: pointer; } details p { margin: 8px 0 0; color: var(--ink-2); font-size: 14px; line-height: 1.55; }
</style>
