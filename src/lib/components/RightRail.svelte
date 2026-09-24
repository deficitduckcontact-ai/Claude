<script lang="ts">
  import type { Snippet } from 'svelte';
  import Cover from './Cover.svelte';
  import { session } from '$lib/session.svelte';
  import { allEpisodes, getSeries } from '$lib/data';
  import { money, quote } from '$lib/pricing';
  import { ago } from '$lib/time';

  let { top }: { top?: Snippet } = $props();
  const fresh = $derived(allEpisodes().slice().sort((a, b) => b.publishedAt - a.publishedAt).slice(0, 5));
</script>

<aside class="rail right">
  {@render top?.()}
  <div class="card plan">
    {#if session.subscribed}
      <div class="k">Your plan</div>
      <div class="v">{session.sub.picks.length} artist{session.sub.picks.length === 1 ? '' : 's'} · {money(quote(session.sub.picks.length).monthlyCents)}/mo</div>
      <div class="avs">{#each session.sub.picks.slice(0, 8) as slug}{@const s = getSeries(slug)}{#if s}<Cover series={s} size={26} radius={99} />{/if}{/each}</div>
      <a class="btn small block" href="/me/plan">Change artists</a>
    {:else}
      <div class="k">Support people, not a platform</div>
      <div class="v">Pick artists at $2.49 each.</div>
      <p class="muted">Every premium comic unlocks, and 85% of what you pay goes to the artists you picked.</p>
      <a class="btn primary block" href="/subscribe">Pick your artists</a>
    {/if}
  </div>

  <div class="card">
    <div class="pad">
      <h3>New this week</h3>
      {#each fresh as e (e.slug + e.id)}
        {@const s = getSeries(e.slug)}
        {#if s}
          <a class="new" href="/s/{e.slug}/{e.id}">
            <Cover series={s} size={38} radius={6} />
            <span><b>{e.title}</b><small class="faint">{s.title} · {ago(e.publishedAt, session.now)}</small></span>
          </a>
        {/if}
      {/each}
    </div>
  </div>

  <div class="card cta">
    <div class="pad">
      <h3>Make comics?</h3>
      <p class="muted">Keep 85%. Readers pick <em>you</em>, not a tier. Payouts via Stripe.</p>
      <a class="btn soft block" href="/creators">Creator info</a>
    </div>
  </div>

  <footer class="faint">
    <a href="/how-it-works">How it works</a> · <a href="/creators">Creators</a> · <a href="/legal/terms">Terms</a> · <a href="/legal/privacy">Privacy</a>
    <br />TinyCoup — working name. © 2026
  </footer>
</aside>

<style>
  .rail > :global(*) + :global(*) { margin-top: 14px; }
  .plan { padding: 14px 16px; background: var(--cream); border-color: #f0e3bc; }
  .k { font-size: 11px; text-transform: uppercase; letter-spacing: 0.07em; color: var(--ink-4); font-weight: 700; }
  .v { font-size: 15px; font-weight: 700; color: var(--ink-2); margin: 3px 0 6px; }
  .plan p { font-size: 13px; margin: 0 0 10px; }
  .avs { display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 10px; }
  h3 { font-size: 14px; margin: 0 0 8px; }
  .new { display: flex; gap: 10px; align-items: center; padding: 6px 0; text-decoration: none; }
  .new span { display: flex; flex-direction: column; min-width: 0; font-size: 13px; }
  .new b { font-weight: 600; color: var(--ink-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .new small { font-size: 11.5px; }
  .new:hover b { text-decoration: underline; }
  .cta { background: var(--mint); border-color: #bee8d6; }
  .cta p { font-size: 13px; margin: 0 0 10px; }
  footer { font-size: 11.5px; line-height: 1.7; padding: 0 4px; }
</style>
