<script lang="ts">
  import { goto } from '$app/navigation';
  import RequireAuth from '$lib/components/RequireAuth.svelte';
  import { createSeries } from '$lib/api';

  let title = $state(''); let tagline = $state(''); let about = $state(''); let tags = $state('');
  let err = $state(''); let busy = $state(false);
  async function submit(e: SubmitEvent) {
    e.preventDefault(); err = ''; busy = true;
    try {
      const slug = await createSeries({ title: title.trim(), tagline: tagline.trim(), about: about.trim(), tags: tags.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean).slice(0, 5) });
      goto(`/studio/upload?series=${slug}`);
    } catch (x) { err = (x as Error).message; busy = false; }
  }
</script>

<svelte:head><title>New series — TinyCoup</title></svelte:head>

<RequireAuth creator>
  <div class="shell narrow pad-m">
    <h1>New series</h1>
    <form class="card pad" onsubmit={submit}>
      <div class="field"><label for="t">Title</label><input id="t" class="input" bind:value={title} maxlength="60" required /></div>
      <div class="field"><label for="g">Tagline</label><input id="g" class="input" bind:value={tagline} maxlength="90" placeholder="One line that makes someone click" required /></div>
      <div class="field"><label for="a">About</label><textarea id="a" class="input" bind:value={about} maxlength="1200"></textarea></div>
      <div class="field"><label for="tg">Tags (comma separated, up to 5)</label><input id="tg" class="input" bind:value={tags} placeholder="humor, science" /></div>
      <div class="todo-box" style="margin-bottom:12px"><b>TODO:</b> cover image upload (square, derived to 400/800 webp), co-creators (split between several creators), schedule label, mature-content flag.</div>
      {#if err}<div class="error">{err}</div>{/if}
      <button class="btn primary big" disabled={busy}>Create series</button>
    </form>
  </div>
</RequireAuth>
