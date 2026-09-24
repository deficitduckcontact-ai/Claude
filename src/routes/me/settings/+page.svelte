<script lang="ts">
  import RequireAuth from '$lib/components/RequireAuth.svelte';
  import { session } from '$lib/session.svelte';
</script>

<svelte:head><title>Settings — TinyCoup</title><meta name="robots" content="noindex" /></svelte:head>

<RequireAuth>
  <div class="shell narrow pad-m">
    <h1>Settings</h1>
    <div class="card pad">
      <h3>Reading</h3>
      <div class="field"><label for="d">Default feed layout (desktop)</label>
        <select id="d" class="input" bind:value={session.density} onchange={() => session.save()}>
          <option value="card">Card — big panels</option><option value="compact">Compact — thumbnails</option><option value="classic">Classic — old-reddit rows</option>
        </select></div>
      <div class="field"><label for="s">Default sort</label>
        <select id="s" class="input" bind:value={session.sort} onchange={() => session.save()}>
          <option value="hot">Hot</option><option value="new">New</option><option value="top">Top</option><option value="following">Following</option>
        </select></div>
    </div>
    <div class="card pad" style="margin-top:14px">
      <h3>Profile</h3>
      <div class="todo-box"><b>TODO:</b> display name, bio, avatar upload (storage path <code>avatars/{'{uid}'}</code> is already allowed by the rules), handle change.</div>
    </div>
    <div class="card pad" style="margin-top:14px">
      <h3>Notifications</h3>
      <div class="todo-box"><b>TODO:</b> email when a followed series posts (Firestore trigger → email extension), weekly digest, web push for the PWA.</div>
    </div>
    <div class="card pad" style="margin-top:14px">
      <h3>Account</h3>
      <div class="row" style="flex-wrap:wrap"><button class="btn" onclick={() => session.signOut()}>Sign out</button>
        <button class="btn" disabled title="TODO">Export my data</button><button class="btn" disabled title="TODO: callable that cancels Stripe, deletes auth + user docs">Delete account</button></div>
    </div>
  </div>
</RequireAuth>

<style>h3 { margin: 0 0 12px; font-size: 15px; }</style>
