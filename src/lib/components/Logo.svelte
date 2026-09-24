<script lang="ts">let { size = 22 }: { size?: number } = $props();</script>
<a href="/" class="logo" aria-label="TinyCoup home" style:font-size="{size}px">
  <svg viewBox="0 0 64 64" width={size * 1.15} height={size * 1.15} aria-hidden="true"><rect width="64" height="64" rx="14" fill="var(--brand)"/><rect x="12" y="12" width="18" height="18" rx="3" fill="var(--amber)"/><rect x="34" y="12" width="18" height="18" rx="3" fill="#fff"/><rect x="12" y="34" width="40" height="18" rx="3" fill="#fff"/></svg>
  <span>Tiny<b>Coup</b></span>
</a>
<style>
  .logo { display: inline-flex; align-items: center; gap: 8px; font-weight: 800; letter-spacing: -0.02em; color: var(--ink); text-decoration: none !important; }
  b { color: var(--brand); font-weight: 800; }
</style>
