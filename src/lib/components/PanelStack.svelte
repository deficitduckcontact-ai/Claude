<script lang="ts">
  import Panel from './Panel.svelte';
  import { session } from '$lib/session.svelte';
  import type { PanelSrc } from '$lib/types';

  let { panels, hue, premium = false, eagerFirst = false, onsubscribe }:
    { panels: PanelSrc[]; hue: number; premium?: boolean; eagerFirst?: boolean; onsubscribe?: () => void } = $props();

  // Any active subscription unlocks ALL premium comics platform-wide; picks only
  // decide where the money goes (the mockup's "open question", answered yes).
  const unlocked = $derived(!premium || session.subscribed);
  const visible = $derived(unlocked ? panels : panels.slice(0, 1));
</script>

<div class="stack">
  {#each visible as p, i (i)}
    <Panel panel={p} {hue} eager={eagerFirst && i === 0} />
  {/each}
  {#if !unlocked}
    <div class="wall">
      <div class="chip premium">★ PREMIUM · {panels.length - 1} more panel{panels.length === 2 ? '' : 's'}</div>
      <h3>Subscribers read the whole thing.</h3>
      <p class="muted">From $2.49/month — and that money goes to the artists <em>you</em> pick.</p>
      {#if onsubscribe}
        <button class="btn primary big" onclick={onsubscribe}>Pick your artists</button>
      {:else}
        <a class="btn primary big" href="/subscribe">Pick your artists</a>
      {/if}
    </div>
  {/if}
</div>

<style>
  .stack { display: flex; flex-direction: column; gap: 6px; }
  .wall { text-align: center; padding: 22px 18px 24px; background: linear-gradient(var(--cream), var(--surface)); border: 1px solid var(--cream-line); border-radius: 10px; }
  .wall h3 { margin: 10px 0 4px; font-size: 18px; }
  .wall p { margin: 0 0 14px; font-size: 14px; }
</style>
