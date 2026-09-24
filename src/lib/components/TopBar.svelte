<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import Logo from './Logo.svelte';
  import { session } from '$lib/session.svelte';
  import { avatarArt } from '$lib/art';
  import { LIVE } from '$lib/firebase';

  let q = $state('');
  let menu = $state(false);
  const search = (e: SubmitEvent) => { e.preventDefault(); goto(`/search?q=${encodeURIComponent(q)}`); };
  const on = (p: string) => (p === '/' ? page.url.pathname === '/' : page.url.pathname.startsWith(p));
</script>

<svelte:window onclick={() => (menu = false)} />

<header class="bar">
  <div class="in">
    <Logo />
    <nav class="links desk-only">
      <a href="/" class:on={on('/')}>Home</a>
      <a href="/series" class:on={on('/series')}>Series</a>
      <a href="/how-it-works" class:on={on('/how-it-works')}>How it works</a>
      <a href="/creators" class:on={on('/creators')}>For creators</a>
    </nav>
    <form class="search desk-only" onsubmit={search} role="search">
      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#a0a0a0" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>
      <input bind:value={q} placeholder="Search series, comics or creators" aria-label="Search" />
    </form>
    <div class="grow"></div>
    {#if !LIVE}<span class="chip todo desk-only" title="No Firebase config — accounts, uploads and payments are simulated in this browser">DEMO MODE</span>{/if}
    {#if session.account}
      {#if !session.subscribed}<a class="btn primary small desk-only" href="/subscribe">Subscribe</a>{/if}
      <div class="me">
        <button class="avatar" onclick={(e) => { e.stopPropagation(); menu = !menu; }} aria-haspopup="menu" aria-expanded={menu}>
          <img src={avatarArt(session.account.handle)} alt="" width="30" height="30" />
          <span class="desk-only">{session.account.handle}</span>
        </button>
        {#if menu}
          <div class="menu card" role="menu">
            <a href="/me" role="menuitem">Profile & library</a>
            <a href="/me/plan" role="menuitem">My artists {#if session.subscribed}<span class="chip ok">{session.sub.picks.length}</span>{/if}</a>
            <a href="/me/billing" role="menuitem">Billing</a>
            <a href="/studio" role="menuitem">{session.isCreator ? 'Creator studio' : 'Become a creator'}</a>
            <a href="/me/settings" role="menuitem">Settings</a>
            <hr />
            <button role="menuitem" onclick={() => { session.signOut(); goto('/'); }}>Sign out</button>
          </div>
        {/if}
      </div>
    {:else}
      <a class="btn small ghost" href="/login?next={encodeURIComponent(page.url.pathname)}">Log in</a>
      <a class="btn small primary" href="/signup">Sign up</a>
    {/if}
  </div>
</header>

<style>
  .bar { position: sticky; top: 0; z-index: 30; height: var(--bar); background: #fff; border-bottom: 1px solid var(--line); }
  .in { max-width: 1360px; margin: 0 auto; height: 100%; padding: 0 16px; display: flex; align-items: center; gap: 14px; }
  .links { display: flex; gap: 2px; margin-left: 6px; }
  .links a { padding: 6px 10px; border-radius: 8px; color: var(--ink-3); font-size: 14px; font-weight: 500; text-decoration: none; }
  .links a:hover { background: #f5f4f2; }
  .links a.on { color: var(--ink); background: var(--coup-tint); }
  .search { display: flex; align-items: center; gap: 8px; width: 340px; max-width: 30vw; height: 36px; border: 1px solid var(--line); border-radius: 8px; padding: 0 10px; background: var(--surface-2); }
  .search input { border: 0; outline: 0; background: transparent; flex: 1; font-size: 13.5px; min-width: 0; }
  .search:focus-within { border-color: var(--coup); box-shadow: 0 0 0 3px var(--coup-ring); }
  .me { position: relative; }
  .avatar { display: flex; align-items: center; gap: 8px; border: 0; background: none; cursor: pointer; padding: 3px 6px 3px 3px; border-radius: 999px; font-size: 13.5px; font-weight: 600; color: var(--ink-2); }
  .avatar:hover { background: #f5f4f2; }
  .avatar img { border-radius: 999px; }
  .menu { position: absolute; right: 0; top: 42px; width: 220px; padding: 6px; display: flex; flex-direction: column; box-shadow: var(--shadow); }
  .menu a, .menu button { display: flex; justify-content: space-between; align-items: center; padding: 8px 10px; border-radius: 8px; font-size: 14px; text-decoration: none; background: none; border: 0; text-align: left; cursor: pointer; color: var(--ink-2); }
  .menu a:hover, .menu button:hover { background: #f5f4f2; }
  hr { border: 0; border-top: 1px solid var(--line); margin: 4px 0; width: 100%; }
</style>
