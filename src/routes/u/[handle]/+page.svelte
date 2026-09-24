<script lang="ts">
  import { page } from '$app/state';
  import Cover from '$lib/components/Cover.svelte';
  import { avatarArt } from '$lib/art';
  import { allSeries } from '$lib/data';
  import { CREATORS } from '$lib/seed';

  const c = $derived(CREATORS.find((x) => x.handle === page.params.handle));
  const series = $derived(c ? allSeries().filter((s) => s.creatorUids.includes(c.uid)) : []);
  // TODO(live): load users/{uid} + creators/{uid} by handle for accounts created after build.
</script>

<svelte:head>{#if c}<title>{c.name} — TinyCoup</title>{/if}</svelte:head>

<div class="shell narrow pad-m">
  {#if !c}<h1>No one here by that name.</h1>
  {:else}
    <div class="card pad hd">
      <img src={avatarArt(c.handle)} alt="" width="80" height="80" />
      <div><h1>{c.name}</h1><div class="faint">@{c.handle}</div><p>{c.bio}</p></div>
    </div>
    <h3>Series</h3>
    {#each series as s (s.slug)}
      <a class="card r" href="/s/{s.slug}"><Cover series={s} size={56} radius={10} /><span><b>{s.title}</b><small class="faint">{s.tagline}</small></span></a>
    {/each}
  {/if}
</div>

<style>
  .hd { display: flex; gap: 16px; align-items: center; } .hd img { border-radius: 99px; } .hd h1 { margin: 0; font-size: 22px; } .hd p { margin: 6px 0 0; color: var(--ink-2); }
  h3 { margin: 18px 0 8px; }
  .r { display: flex; gap: 12px; align-items: center; padding: 10px; margin-bottom: 6px; text-decoration: none; }
  .r span { display: flex; flex-direction: column; }
</style>
