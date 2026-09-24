<script lang="ts">
  import { onMount } from 'svelte';
  let url = $state(''); let copied = $state(false);
  onMount(() => { const u = new URLSearchParams(location.search).get('u') ?? '/'; url = new URL(u.startsWith('/') ? u : '/', location.origin).href; });
  const enc = $derived(encodeURIComponent(url));
  async function copy() { await navigator.clipboard.writeText(url); copied = true; }
</script>
<svelte:head><title>Share — TinyCoup</title><meta name="robots" content="noindex" /></svelte:head>
<div class="shell narrow pad-m">
  <div class="card pad">
    <h1 style="margin-top:0">Share this comic</h1>
    <div class="row"><input class="input" readonly value={url} /><button class="btn primary" onclick={copy}>{copied ? 'Copied' : 'Copy'}</button></div>
    <div class="row" style="margin-top:12px;flex-wrap:wrap">
      <a class="btn" target="_blank" rel="noopener" href="https://bsky.app/intent/compose?text={enc}">Bluesky</a>
      <a class="btn" target="_blank" rel="noopener" href="https://www.reddit.com/submit?url={enc}">Reddit</a>
      <a class="btn" target="_blank" rel="noopener" href="https://www.facebook.com/sharer/sharer.php?u={enc}">Facebook</a>
      <a class="btn" target="_blank" rel="noopener" href="https://x.com/intent/post?url={enc}">X</a>
      <a class="btn" href="mailto:?body={enc}">Email</a>
    </div>
  </div>
</div>
