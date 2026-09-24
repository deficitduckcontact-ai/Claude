<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import TopBar from '$lib/components/TopBar.svelte';
  import BottomNav from '$lib/components/BottomNav.svelte';
  import { session } from '$lib/session.svelte';

  let { children } = $props();
  onMount(() => session.init());
</script>

<svelte:head>
  <title>TinyCoup — comics that pay the artists you pick</title>
  <meta name="description" content="Read comics free. Subscribe from $2.49 and pick exactly which artists your money goes to — 85% goes to them." />
  <meta property="og:site_name" content="TinyCoup" />
</svelte:head>

<a class="sr-only" href="#main">Skip to content</a>
<TopBar />
<main id="main">{@render children()}</main>
<BottomNav />
