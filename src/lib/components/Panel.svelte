<script lang="ts">
  import { panelArt } from '$lib/art';
  import { imageBase } from '$lib/firebase.svelte';
  import type { PanelSrc } from '$lib/types';

  let { panel, hue = 200, eager = false, sizes = '(max-width: 899px) 100vw, 680px' }:
    { panel: PanelSrc; hue?: number; eager?: boolean; sizes?: string } = $props();

  // Derivatives written by functions/src/images.ts:  {base}-{800|1600}.{avif|webp}, {base}-400.webp
  const url = (base: string) => (base.startsWith('http') || base.startsWith('data:') ? base : `${imageBase()}/${base}`);
  const set = (base: string, ext: string) => `${url(base)}-800.${ext} 800w, ${url(base)}-1600.${ext} 1600w`;
</script>

<div class="panel" style:aspect-ratio={panel.kind === 'img' || panel.kind === 'url' ? `${panel.w}/${panel.h}` : '1/1'}>
  {#if panel.kind === 'img'}
    <picture>
      <source type="image/avif" srcset={set(panel.base, 'avif')} {sizes} />
      <source type="image/webp" srcset={set(panel.base, 'webp')} {sizes} />
      <img src="{url(panel.base)}-800.webp" width={panel.w} height={panel.h} alt={panel.alt ?? ''}
        loading={eager ? 'eager' : 'lazy'} fetchpriority={eager ? 'high' : 'auto'} decoding="async" />
    </picture>
  {:else if panel.kind === 'url'}
    <img src={panel.src} width={panel.w} height={panel.h} alt={panel.alt ?? ''} loading={eager ? 'eager' : 'lazy'} decoding="async" />
  {:else if panel.kind === 'art'}
    <img src={panelArt(panel.seed, panel.n, hue)} width="800" height="800" alt={panel.alt ?? `Placeholder panel ${panel.n + 1}`} loading={eager ? 'eager' : 'lazy'} decoding="async" />
  {:else}
    <div class="locked" aria-label="Premium panel"></div>
  {/if}
</div>

<style>
  .panel { width: 100%; background: var(--panel-bg); overflow: hidden; position: relative; }
  .panel img { width: 100%; height: 100%; object-fit: cover; }
  .locked { position: absolute; inset: 0; background: repeating-linear-gradient(135deg, var(--panel-stripe) 0 14px, var(--panel-bg) 14px 28px); }
</style>
