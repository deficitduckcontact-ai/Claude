<script lang="ts">
  // Sidebar cards in the style of the "changing subscriptions" mockup:
  // cream → mint conversion pills, micro-labels, green ✓ reassurances.
  import type { Snippet } from 'svelte';
  import Cover from './Cover.svelte';
  import { session } from '$lib/session.svelte';
  import { allEpisodes, getSeries } from '$lib/data';
  import { money, quote, PER_ARTIST_CENTS } from '$lib/pricing';
  import { ago } from '$lib/time';

  let { top }: { top?: Snippet } = $props();
  const fresh = $derived(allEpisodes().slice().sort((a, b) => b.publishedAt - a.publishedAt).slice(0, 5));
  const n = $derived(session.subscribed ? session.sub.picks.length : 3);
  const q = $derived(quote(n));
</script>

<aside class="side">
  {@render top?.()}

  <div class="card plan">
    <div class="pad">
      {#if session.subscribed}
        <div class="k">Your plan</div>
        <h3>Backing {n} artist{n === 1 ? '' : 's'}</h3>
        <div class="avs">{#each session.sub.picks.slice(0, 9) as slug}{@const s = getSeries(slug)}{#if s}<a href="/s/{s.slug}" title={s.title}><Cover series={s} size={30} radius={99} /></a>{/if}{/each}</div>
      {:else}
        <div class="k">Support people, not a platform</div>
        <h3>Pick the artists you pay.</h3>
        <p class="sub">Your subscription becomes <strong>artist subscriptions</strong> — {money(PER_ARTIST_CENTS)} each.</p>
      {/if}
      <div class="convert">
        <div class="pill now"><div class="k">{session.subscribed ? 'You pay' : `e.g. ${n} artists`}</div><div class="v">{money(q.monthlyCents)}<small>/mo</small></div></div>
        <div class="arrow">→</div>
        <div class="pill next"><div class="k">Artists get</div><div class="v">{money(q.creatorsCents)}<small>/mo</small></div></div>
      </div>
      <div class="assure">
        <span><b>✓</b> Every premium comic unlocks</span>
        <span><b>✓</b> 85% goes to who you pick</span>
      </div>
      {#if session.subscribed}<a class="btn block" href="/me/plan">Change artists</a>
      {:else}<a class="btn primary block" href="/subscribe">Pick your artists</a>{/if}
    </div>
  </div>

  <div class="card">
    <div class="pad">
      <div class="k">New this week</div>
      {#each fresh as e (e.slug + e.id)}
        {@const s = getSeries(e.slug)}
        {#if s}
          <a class="new" href="/s/{e.slug}/{e.id}">
            <Cover series={s} size={44} radius={8} />
            <span><b>{e.title}</b><small>{s.title} · {ago(e.publishedAt, session.now)}</small></span>
          </a>
        {/if}
      {/each}
    </div>
  </div>

  <a class="card creator" href={session.isCreator ? '/studio/upload' : '/creators'}>
    <div class="pad">
      <div class="k">{session.isCreator ? 'Creator' : 'Make comics?'}</div>
      <h3>{session.isCreator ? 'Post a new comic' : 'Keep 85%. Readers pick you.'}</h3>
      <p class="sub">{session.isCreator ? 'Upload panels to one of your series.' : 'No tiers, no pool. Paid monthly through Stripe.'}</p>
    </div>
  </a>

  <footer>
    <a href="/how-it-works">About</a> · <a href="/creators">Creators</a> · <a href="/legal/rules">Rules</a> · <a href="/legal/terms">Terms</a> · <a href="/legal/privacy">Privacy</a> · <a href="/legal/copyright">Copyright</a> · <a href="/legal/refunds">Refunds</a>
    <br />TinyCoup (working name) © 2026
  </footer>
</aside>

<style>
  .side { display: flex; flex-direction: column; gap: 16px; }
  h3 { margin: 4px 0 4px; font-size: 17px; letter-spacing: -0.01em; }
  .sub { margin: 0 0 12px; font-family: var(--serif); font-style: italic; font-size: 14px; color: var(--ink-3); line-height: 1.45; }
  .plan .pad { padding: 16px; }
  .avs { display: flex; gap: 4px; flex-wrap: wrap; margin: 8px 0 12px; }
  .convert { display: flex; align-items: stretch; gap: 8px; margin: 4px 0 10px; }
  .pill { flex: 1; border: 1px solid var(--line); border-radius: 12px; padding: 8px 12px; }
  .pill .k { font-size: 9.5px; }
  .pill .v { font-size: 18px; font-weight: 700; color: var(--ink); margin-top: 2px; }
  .pill small { font-size: 12px; font-weight: 500; color: var(--ink-3); }
  .pill.now { background: var(--cream); border-color: var(--cream-line); }
  .pill.next { background: var(--mint); border-color: var(--mint-line); }
  .arrow { align-self: center; color: var(--line-strong); }
  .assure { display: flex; flex-direction: column; gap: 3px; margin-bottom: 14px; }
  .assure span { font-size: 12.5px; color: var(--ink-3); }
  .assure b { color: var(--ok); margin-right: 4px; }
  .new { display: flex; gap: 12px; align-items: center; padding: 7px 0; text-decoration: none; }
  .new:first-of-type { margin-top: 6px; }
  .new span { display: flex; flex-direction: column; min-width: 0; font-size: 14px; }
  .new b { font-weight: 600; color: var(--ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .new small { font-size: 12px; color: var(--ink-4); }
  .new:hover b { color: var(--brand); }
  .creator { display: block; text-decoration: none !important; background: var(--mint); border-color: var(--mint-line); }
  .creator:hover { border-color: var(--ok); }
  .creator .sub { margin: 0; }
  footer { font-size: 12px; line-height: 1.8; padding: 0 4px; color: var(--ink-4); }
  footer a { color: var(--ink-3); }
</style>
