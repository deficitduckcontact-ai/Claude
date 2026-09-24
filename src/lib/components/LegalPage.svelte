<script lang="ts">
  import type { Snippet } from 'svelte';
  let { title, updated = 'DRAFT — not yet in effect', children }: { title: string; updated?: string; children: Snippet } = $props();
  const pages = [
    ['/legal/terms', 'Terms of Service'], ['/legal/rules', 'Community Rules'], ['/legal/privacy', 'Privacy Policy'],
    ['/legal/copyright', 'Copyright & DMCA'], ['/legal/refunds', 'Refunds & Cancellation']
  ];
</script>

<svelte:head><title>{title} — TinyCoup</title></svelte:head>

<div class="shell mid pad-m">
  <div class="lg">
    <nav class="toc">{#each pages as [href, label]}<a {href}>{label}</a>{/each}</nav>
    <article class="card pad doc">
      <h1>{title}</h1>
      <p class="faint">{updated}</p>
      <div class="todo-box"><b>Draft for a lawyer to review</b> before launch. It's written to match how TinyCoup actually works, but it isn't legal advice.</div>
      {@render children()}
    </article>
  </div>
</div>

<style>
  .lg { display: grid; grid-template-columns: 200px minmax(0, 1fr); gap: 20px; align-items: start; }
  .toc { display: flex; flex-direction: column; gap: 2px; position: sticky; top: calc(var(--bar) + 16px); }
  .toc a { padding: 6px 10px; border-radius: 6px; color: var(--link); font-size: 14px; }
  .toc a:hover { background: var(--surface); text-decoration: none; }
  .doc { line-height: 1.65; font-size: 15px; }
  .doc :global(h2) { font-size: 17px; margin: 24px 0 6px; }
  .doc :global(li) { margin: 4px 0; }
  .doc :global(a) { color: var(--link); }
  .doc h1 { margin: 0; }
  @media (max-width: 899px) { .lg { grid-template-columns: 1fr; } .toc { position: static; flex-direction: row; flex-wrap: wrap; } }
</style>
