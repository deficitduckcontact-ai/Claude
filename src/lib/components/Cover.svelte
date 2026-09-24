<script lang="ts">
  import { coverArt } from '$lib/art';
  import type { Series } from '$lib/types';
  let { series, size = 72, radius = 8 }: { series: Series; size?: number | string; radius?: number } = $props();
  // TODO(live): series.cover (uploaded, derived to 400 webp) replaces the placeholder.
  const src = $derived(coverArt(series.slug, series.title, series.hue));
  const px = $derived(typeof size === 'number' ? `${size}px` : size);
</script>

<img {src} alt="" width="400" height="400" loading="lazy" style:width={px} style:height={px} style:border-radius="{radius}px" class="cover" />

<style>.cover { object-fit: cover; background: var(--hairline); flex: 0 0 auto; box-shadow: inset 0 0 0 1px rgba(23, 23, 23, 0.06); }</style>
