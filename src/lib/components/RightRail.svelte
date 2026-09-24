<script lang="ts">
  // Old-reddit sidebar: big submit button, then boxes.
  import type { Snippet } from 'svelte';
  import Cover from './Cover.svelte';
  import { session } from '$lib/session.svelte';
  import { allEpisodes, getSeries } from '$lib/data';
  import { money, quote } from '$lib/pricing';
  import { ago } from '$lib/time';

  let { top }: { top?: Snippet } = $props();
  const fresh = $derived(allEpisodes().slice().sort((a, b) => b.publishedAt - a.publishedAt).slice(0, 5));
</script>

<aside class="side">
  <a class="submit" href={session.isCreator ? '/studio/upload' : '/studio'}>
    <span>{session.isCreator ? 'Post a new comic' : 'Publish your comics'}</span>
    <small>{session.isCreator ? 'upload panels to one of your series' : 'keep 85% · paid monthly via Stripe'}</small>
  </a>

  {@render top?.()}

  <div class="box plan">
    {#if session.subscribed}
      <h4>your plan</h4>
      <div class="v">{session.sub.picks.length} artist{session.sub.picks.length === 1 ? '' : 's'} · {money(quote(session.sub.picks.length).monthlyCents)}/mo</div>
      <div class="avs">{#each session.sub.picks.slice(0, 10) as slug}{@const s = getSeries(slug)}{#if s}<a href="/s/{s.slug}" title={s.title}><Cover series={s} size={26} radius={99} /></a>{/if}{/each}</div>
      <a class="btn small block" href="/me/plan">change artists</a>
    {:else}
      <h4>support people, not a platform</h4>
      <div class="v">Pick artists at $2.49 each.</div>
      <p>Every premium comic unlocks, and 85% of what you pay goes to the artists you picked.</p>
      <a class="btn primary block" href="/subscribe">Pick your artists</a>
    {/if}
  </div>

  <div class="box">
    <h4>new this week</h4>
    {#each fresh as e (e.slug + e.id)}
      {@const s = getSeries(e.slug)}
      {#if s}
        <a class="new" href="/s/{e.slug}/{e.id}">
          <Cover series={s} size={36} radius={4} />
          <span><b>{e.title}</b><small>{s.slug} · {ago(e.publishedAt, session.now)}</small></span>
        </a>
      {/if}
    {/each}
  </div>

  <div class="box faint rules">
    <h4>how TinyCoup works</h4>
    <ol>
      <li>Reading is free.</li>
      <li>Subscribers pick artists — $2.49 each, one charge.</li>
      <li>85% goes to the artists picked.</li>
      <li>Any subscription unlocks all premium comics.</li>
    </ol>
    <a href="/how-it-works">more »</a>
  </div>

  <footer class="faint">
    <a href="/how-it-works">about</a> · <a href="/creators">creators</a> · <a href="/legal/rules">rules</a> · <a href="/legal/terms">terms</a> · <a href="/legal/privacy">privacy</a> · <a href="/legal/copyright">copyright</a> · <a href="/legal/refunds">refunds</a>
    <br />TinyCoup (working name) © 2026 · keyboard: <kbd>?</kbd>
  </footer>
</aside>

<style>
  .side { display: flex; flex-direction: column; gap: 12px; }
  .submit { display: flex; flex-direction: column; align-items: center; padding: 10px; border-radius: 6px; background: linear-gradient(var(--surface), var(--pill)); border: 1px solid var(--pill-line); text-decoration: none !important; color: var(--ink); box-shadow: var(--shadow-sm); }
  .submit:hover { border-color: var(--brand); }
  .submit span { font-family: var(--classic); font-weight: 700; font-size: 15px; }
  .submit small { font-size: 11px; color: var(--ink-3); margin-top: 2px; }
  .box { background: var(--surface); border: 1px solid var(--line); border-radius: 6px; padding: 12px 14px; }
  .box h4 { font-family: var(--classic); font-size: 11px; text-transform: lowercase; color: var(--ink-4); margin: 0 0 8px; font-weight: 700; letter-spacing: 0.02em; }
  .plan { background: var(--brand-tint); border-color: var(--header-line); }
  .v { font-size: 15px; font-weight: 700; color: var(--ink); margin-bottom: 6px; }
  .plan p { font-size: 13px; margin: 0 0 10px; color: var(--ink-3); }
  .avs { display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 10px; }
  .new { display: flex; gap: 10px; align-items: center; padding: 5px 0; text-decoration: none; }
  .new span { display: flex; flex-direction: column; min-width: 0; font-size: 13px; }
  .new b { font-weight: 600; color: var(--link); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .new small { font-size: 11px; color: var(--ink-4); font-family: var(--classic); }
  .new:hover b { text-decoration: underline; }
  .rules ol { margin: 0 0 6px; padding-left: 18px; font-size: 12.5px; line-height: 1.6; color: var(--ink-3); }
  .rules a { font-size: 12px; color: var(--link); }
  footer { font-size: 11px; line-height: 1.7; padding: 0 4px; font-family: var(--classic); }
  kbd { background: var(--surface); border: 1px solid var(--line); border-radius: 3px; padding: 0 4px; }
</style>
