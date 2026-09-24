<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import RequireAuth from '$lib/components/RequireAuth.svelte';
  import { session } from '$lib/session.svelte';
  import { allSeries } from '$lib/data';
  import { publishEpisode } from '$lib/api';
  import { LIVE } from '$lib/firebase';

  interface Item { file: File; url: string; w: number; h: number }
  let slug = $state('');
  let title = $state('');
  let caption = $state('');
  let premium = $state(false);
  let items = $state<Item[]>([]);
  let over = $state(false);
  let dragFrom = $state(-1);
  let progress = $state(-1);
  let err = $state('');

  const mine = $derived(allSeries().filter((s) => session.account && s.creatorUids.includes(session.account.uid)));
  onMount(() => { slug = new URLSearchParams(location.search).get('series') ?? ''; });
  $effect(() => { if (!slug && mine[0]) slug = mine[0].slug; });

  async function add(files: FileList | File[]) {
    err = '';
    for (const file of Array.from(files)) {
      if (!/^image\/(png|jpeg|webp|avif|tiff)$/.test(file.type)) { err = `${file.name}: use PNG, JPG, WebP or AVIF`; continue; }
      if (file.size > 30 * 1024 * 1024) { err = `${file.name}: 30 MB max per panel`; continue; }
      const url = URL.createObjectURL(file);
      const bmp = await createImageBitmap(file);
      items = [...items, { file, url, w: bmp.width, h: bmp.height }].slice(0, 20);
    }
  }
  function move(i: number, d: number) { const j = i + d; if (j < 0 || j >= items.length) return; const n = items.slice(); [n[i], n[j]] = [n[j], n[i]]; items = n; }
  function remove(i: number) { URL.revokeObjectURL(items[i].url); items = items.filter((_, k) => k !== i); }
  function drop(i: number) { if (dragFrom < 0 || dragFrom === i) return; const n = items.slice(); const [x] = n.splice(dragFrom, 1); n.splice(i, 0, x); items = n; dragFrom = -1; }
  const warn = (it: Item) => Math.max(it.w, it.h) < 1600 ? `${it.w}×${it.h} — under 1600px, will look soft on retina screens` : Math.abs(it.w / it.h - 1) > 0.02 ? `${it.w}×${it.h} — not square; shown as-is` : '';

  async function publish() {
    err = '';
    if (!slug) return (err = 'Pick a series');
    if (!title.trim()) return (err = 'Give the episode a title');
    progress = 0;
    try {
      const r = await publishEpisode({ slug, title: title.trim(), caption: caption.trim(), premium, files: items.map((i) => i.file) }, (p) => (progress = p));
      goto(`/s/${r.slug}/${r.id}`);
    } catch (e) { err = (e as Error).message; progress = -1; }
  }
</script>

<svelte:head><title>New episode — TinyCoup</title></svelte:head>

<RequireAuth creator>
  <div class="shell mid pad-m">
    <h1>New episode</h1>
    {#if !mine.length}
      <div class="card pad">You need a series first. <a class="btn primary small" href="/studio/new-series">Create a series</a></div>
    {:else}
      <div class="cols">
        <div>
          <div class="card pad">
            <div class="field"><label for="s">Series</label>
              <select id="s" class="input" bind:value={slug}>{#each mine as s}<option value={s.slug}>{s.title}</option>{/each}</select></div>
            <div class="field"><label for="t">Episode title</label><input id="t" class="input" bind:value={title} maxlength="80" /></div>
            <div class="field"><label for="c">Caption (optional)</label><textarea id="c" class="input" bind:value={caption} maxlength="600"></textarea></div>
            <label class="toggle"><input type="checkbox" bind:checked={premium} /> <span><b>Premium</b> — first panel is a free preview; subscribers see the rest</span></label>
            <div class="todo-box" style="margin-top:12px"><b>TODO:</b> schedule for later, alt text per panel, save as draft, content warnings.</div>
          </div>

          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div class="drop" class:over ondragover={(e) => { e.preventDefault(); over = true; }} ondragleave={() => (over = false)}
            ondrop={(e) => { e.preventDefault(); over = false; if (e.dataTransfer?.files.length) add(e.dataTransfer.files); }}>
            <p><b>Drop panels here</b> or <label class="pick">choose files<input type="file" accept="image/png,image/jpeg,image/webp,image/avif" multiple onchange={(e) => { const f = e.currentTarget.files; if (f) add(f); e.currentTarget.value = ''; }} /></label></p>
            <p class="faint small">Square, 1600×1600 or larger · PNG / JPG / WebP / AVIF · up to 20 panels. We store your master and make the 1600 + 800 versions.</p>
          </div>

          <ol class="items">
            {#each items as it, i (it.url)}
              <li draggable="true" ondragstart={() => (dragFrom = i)} ondragover={(e) => e.preventDefault()} ondrop={() => drop(i)}>
                <span class="n">{i + 1}</span><img src={it.url} alt="" />
                <div class="grow"><div class="fn">{it.file.name}</div>{#if warn(it)}<div class="w">⚠ {warn(it)}</div>{:else}<div class="okk">✓ {it.w}×{it.h}</div>{/if}</div>
                <button class="btn small ghost" onclick={() => move(i, -1)} aria-label="Move up">↑</button>
                <button class="btn small ghost" onclick={() => move(i, 1)} aria-label="Move down">↓</button>
                <button class="btn small ghost" onclick={() => remove(i)} aria-label="Remove">✕</button>
              </li>
            {/each}
          </ol>

          {#if err}<p class="error">{err}</p>{/if}
          <div class="row">
            <button class="btn primary big" onclick={publish} disabled={progress >= 0 || !items.length}>
              {progress >= 0 ? `Publishing… ${Math.round(progress * 100)}%` : `Publish ${items.length} panel${items.length === 1 ? '' : 's'}`}</button>
            {#if !LIVE}<span class="faint small">Demo: images are shrunk and kept in this browser.</span>{/if}
          </div>
        </div>

        <aside class="preview desk-only">
          <div class="k">Reader preview</div>
          <div class="phone">
            {#each items as it, i (it.url)}
              <img src={it.url} alt="" class:blur={premium && i > 0} />
            {:else}<div class="ph faint">Panels appear here</div>{/each}
          </div>
        </aside>
      </div>
    {/if}
  </div>
</RequireAuth>

<style>
  .cols { display: grid; grid-template-columns: minmax(0, 1fr) 300px; gap: 20px; align-items: start; }
  @media (max-width: 899px) { .cols { grid-template-columns: 1fr; } }
  .toggle { display: flex; gap: 8px; align-items: flex-start; font-size: 14px; cursor: pointer; }
  .drop { margin: 14px 0; border: 2px dashed var(--line-strong); border-radius: 12px; padding: 26px; text-align: center; background: #fff; transition: 0.15s; }
  .drop.over { border-color: var(--coup); background: var(--coup-tint); }
  .drop p { margin: 4px 0; }
  .pick { color: var(--coup); font-weight: 600; cursor: pointer; text-decoration: underline; }
  .pick input { display: none; }
  .small { font-size: 12.5px; }
  .items { list-style: none; padding: 0; margin: 0 0 14px; display: flex; flex-direction: column; gap: 6px; }
  .items li { display: flex; align-items: center; gap: 10px; background: #fff; border: 1px solid var(--line); border-radius: 10px; padding: 6px 8px; cursor: grab; }
  .items img { width: 52px; height: 52px; object-fit: cover; border-radius: 6px; }
  .n { width: 20px; text-align: center; font-weight: 700; color: var(--ink-4); }
  .fn { font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 320px; }
  .w { font-size: 12px; color: #9a6400; } .okk { font-size: 12px; color: var(--ok); }
  .preview { position: sticky; top: calc(var(--bar) + 16px); }
  .k { font-size: 11px; text-transform: uppercase; letter-spacing: 0.07em; color: var(--ink-4); font-weight: 700; margin-bottom: 8px; }
  .phone { width: 260px; max-height: 70vh; overflow: auto; border: 8px solid #171717; border-radius: 28px; background: #fff; display: flex; flex-direction: column; gap: 4px; padding: 4px 0; }
  .phone img { width: 100%; } .phone img.blur { filter: blur(10px) grayscale(0.4); }
  .ph { padding: 80px 20px; text-align: center; font-size: 13px; }
</style>
