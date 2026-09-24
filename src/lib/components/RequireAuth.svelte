<script lang="ts">
  import type { Snippet } from 'svelte';
  import { goto } from '$app/navigation';
  import { session } from '$lib/session.svelte';
  let { children, creator = false }: { children: Snippet; creator?: boolean } = $props();
  $effect(() => { if (session.ready && !session.account) goto(`/login?next=${encodeURIComponent(location.pathname)}`, { replaceState: true }); });
</script>

{#if !session.ready || !session.account}
  <p class="faint" style="text-align:center;padding:60px 0">Loading…</p>
{:else if creator && !session.isCreator}
  <div class="shell narrow pad-m" style="text-align:center;padding-top:50px"><h1>Creators only</h1><a class="btn primary" href="/studio">Become a creator</a></div>
{:else}
  {@render children()}
{/if}
