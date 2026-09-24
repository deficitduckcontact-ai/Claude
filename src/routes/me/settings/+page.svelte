<script lang="ts">
  import { goto } from '$app/navigation';
  import RequireAuth from '$lib/components/RequireAuth.svelte';
  import { session } from '$lib/session.svelte';
  import { theme, type Theme } from '$lib/theme.svelte';
  import { deleteAccount } from '$lib/api';
  import { on } from '$lib/features';

  let verifyMsg = $state('');
  let confirm = $state('');
  let delErr = $state('');
  let deleting = $state(false);
  async function verify() { try { verifyMsg = (await session.verifyEmail()) ?? ''; } catch (e) { verifyMsg = (e as Error).message; } }
  async function del() {
    deleting = true; delErr = '';
    try { await deleteAccount(confirm); goto('/?deleted=1'); } catch (e) { delErr = (e as Error).message; deleting = false; }
  }
</script>

<svelte:head><title>Settings — TinyCoup</title><meta name="robots" content="noindex" /></svelte:head>

<RequireAuth>
  <div class="shell narrow pad-m">
    <h1>Settings</h1>
    <div class="card pad">
      <h3>Reading</h3>
      <div class="field"><label for="t">Theme</label>
        <select id="t" class="input" value={theme.choice} onchange={(e) => theme.set(e.currentTarget.value as Theme)}>
          <option value="system">Match my device</option><option value="light">Light</option><option value="dark">Dark</option>
        </select></div>
      <div class="field"><label for="d">Default feed layout (desktop)</label>
        <select id="d" class="input" bind:value={session.density} onchange={() => session.save()}>
          <option value="card">Card — big panels</option><option value="compact">Compact — thumbnails</option><option value="classic">Classic — dense list</option>
        </select></div>
      <div class="field"><label for="s">Default sort</label>
        <select id="s" class="input" bind:value={session.sort} onchange={() => session.save()}>
          <option value="hot">Hot</option><option value="new">New</option><option value="top">Top</option><option value="following">Following</option>
        </select></div>
    </div>

    <div class="card pad sec">
      <h3>Email</h3>
      <p class="row"><span class="grow">{session.account?.email}</span>
        {#if session.account?.emailVerified}<span class="chip ok">verified</span>{:else}<span class="chip todo">not verified</span>{/if}</p>
      {#if !session.account?.emailVerified}
        <button class="btn" onclick={verify}>I've clicked the link / resend it</button>
        {#if verifyMsg}<p class="muted">{verifyMsg}</p>{/if}
      {/if}
      <p class="faint small">We only email you about your account and the artists you back. Marketing emails are opt-in (Canada's anti-spam law, CASL).</p>
    </div>

    <div class="card pad sec">
      <h3>Profile</h3>
      <div class="todo-box"><b>TODO:</b> display name, bio, avatar upload (storage path <code>avatars/{'{uid}'}</code> is already allowed by the rules).</div>
    </div>
    <div class="card pad sec">
      <h3>Notifications</h3>
      <div class="todo-box"><b>TODO:</b> email when a followed series posts, weekly digest, web push for the phone app — each opt-in.</div>
    </div>

    <div class="card pad sec danger">
      <h3>Delete account</h3>
      <p class="small">This cancels your subscription, deletes your profile, follows, likes and history, and replaces your comments with “[deleted]”. Payment records are kept for 7 years because tax law requires it. This can't be undone.</p>
      {#if !on('selfDelete')}
        <p class="small">During the preview, email <b>[support email]</b> from this address and we'll delete it within 7 days.</p>
      {:else}
      <div class="row">
        <input class="input" placeholder="Type DELETE" bind:value={confirm} aria-label="Type DELETE to confirm" />
        <button class="btn danger-btn" disabled={confirm !== 'DELETE' || deleting} onclick={del}>{deleting ? 'Deleting…' : 'Delete my account'}</button>
      </div>
      {#if delErr}<p class="error">{delErr}</p>{/if}
      {/if}
      <p class="faint small">Want a copy of your data first? <a href="mailto:privacy@tinycoup.example?subject=Data%20export" class="lnk">Ask us</a> — TODO: self-serve export.</p>
    </div>
  </div>
</RequireAuth>

<style>
  h3 { margin: 0 0 12px; font-size: 15px; }
  .sec { margin-top: 14px; }
  .small { font-size: 12.5px; line-height: 1.5; }
  .danger { border-color: var(--heart-line); }
  .danger-btn { border-color: var(--heart); color: var(--heart); }
  .lnk { color: var(--link); }
</style>
