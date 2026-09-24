<script lang="ts">
  // The strip under the header where old reddit put the subreddit name and
  // "hot new rising top" tabs. It shares the header's light-blue background.
  import type { Snippet } from 'svelte';
  let { title, tabs, right, icon }: {
    title: string;
    tabs: { label: string; on: boolean; href?: string; onclick?: () => void }[];
    right?: Snippet; icon?: Snippet;
  } = $props();
</script>

<div class="ht">
  <div class="in">
    {#if icon}<span class="icon">{@render icon()}</span>{/if}
    <span class="title">{title}</span>
    <ul class="tabs" role="tablist">
      {#each tabs as t}
        <li>
          {#if t.href}<a href={t.href} class:on={t.on} role="tab" aria-selected={t.on}>{t.label}</a>
          {:else}<button class:on={t.on} role="tab" aria-selected={t.on} onclick={t.onclick}>{t.label}</button>{/if}
        </li>
      {/each}
    </ul>
    <span class="grow"></span>
    {@render right?.()}
  </div>
</div>

<style>
  .ht { background: var(--header); border-bottom: 1px solid var(--header-line); margin-top: -1px; }
  .in { display: flex; align-items: flex-end; gap: 12px; padding: 0 16px; min-height: 34px; }
  .icon { align-self: center; display: flex; }
  .title { font-family: var(--classic); font-weight: 700; font-size: 16px; text-transform: uppercase; letter-spacing: 0.02em; padding-bottom: 7px; color: var(--ink); }
  .tabs { list-style: none; margin: 0; padding: 0; display: flex; gap: 4px; }
  .tabs a, .tabs button { display: block; font-family: var(--classic); font-size: 12px; font-weight: 700; padding: 3px 9px 4px; border: 1px solid transparent; border-bottom: 0; border-radius: 3px 3px 0 0; background: #eff7ff; color: var(--link); text-decoration: none; cursor: pointer; margin-bottom: -1px; }
  .tabs a:hover, .tabs button:hover { text-decoration: underline; }
  .tabs .on { background: #fff; color: var(--brand); border-color: var(--header-line); padding-bottom: 5px; }
  .in > :global(.right) { align-self: center; }
  @media (max-width: 899px) {
    .ht { position: sticky; top: var(--bar); z-index: 5; background: #fff; border-bottom-color: var(--line); }
    .title, .icon { display: none; }
    .in { padding: 0 8px; align-items: stretch; }
    .in > .grow { display: none; }
    .tabs { flex: 1; overflow-x: auto; scrollbar-width: none; gap: 0; }
    .tabs li { flex: 1; }
    .tabs a, .tabs button { font-family: var(--sans); text-transform: capitalize; font-size: 14px; font-weight: 600; background: none; border: 0; border-bottom: 3px solid transparent; border-radius: 0; padding: 10px 4px; width: 100%; text-align: center; color: var(--ink-3); margin: 0; }
    .tabs .on { color: var(--brand); border-bottom-color: var(--brand); background: none; }
  }
</style>
