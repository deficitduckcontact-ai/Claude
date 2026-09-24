<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import Logo from './Logo.svelte';
  import { session } from '$lib/session.svelte';
  import { avatarArt } from '$lib/art';
  import { LIVE } from '$lib/firebase';
  import { theme } from '$lib/theme.svelte';

  let q = $state('');
  let menu = $state(false);
  const search = (e: SubmitEvent) => { e.preventDefault(); goto(`/search?q=${encodeURIComponent(q)}`); };
  const loginHref = $derived(`/login?next=${encodeURIComponent(page.url.pathname)}`);
</script>

<svelte:window onclick={() => (menu = false)} />

<header class="bar">
  <div class="in">
    <Logo />
    <form class="search desk-only" onsubmit={search} role="search">
      <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>
      <input bind:value={q} placeholder="Search series, comics or creators" aria-label="Search" />
    </form>
    <div class="grow mob-only"></div>

    <div class="right">
      {#if !LIVE}<span class="chip todo desk-only" title="No Firebase config — accounts, uploads and payments are simulated in this browser">DEMO</span>{/if}
      {#if session.account}
        {#if session.isCreator}
          <a class="btn ghost create desk-only" href="/studio/upload" title="Post a comic">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg> Create
          </a>
        {/if}
        {#if !session.subscribed}<a class="btn primary small desk-only" href="/subscribe">Subscribe</a>{/if}
        <div class="me">
          <button class="avatar" onclick={(e) => { e.stopPropagation(); menu = !menu; }} aria-haspopup="menu" aria-expanded={menu} aria-label="Account menu">
            <img src={avatarArt(session.account.handle)} alt="" width="34" height="34" />
            {#if session.subscribed}<span class="dot" title="Supporter"></span>{/if}
          </button>
          {#if menu}
            <div class="menu card" role="menu">
              <div class="who"><img src={avatarArt(session.account.handle)} alt="" width="40" height="40" />
                <div><b>{session.account.displayName || session.account.handle}</b><small>@{session.account.handle}</small></div></div>
              <a href="/me" role="menuitem">Profile & library</a>
              <a href="/me/plan" role="menuitem">My artists {#if session.subscribed}<span class="chip ok">{session.sub.picks.length}</span>{/if}</a>
              <a href="/me/billing" role="menuitem">Billing</a>
              <a href="/studio" role="menuitem">{session.isCreator ? 'Creator studio' : 'Become a creator'}</a>
              <a href="/me/settings" role="menuitem">Settings</a>
              <button role="menuitem" onclick={(e) => { e.stopPropagation(); theme.toggle(); }}>
                <span>Dark mode</span><span class="switch" class:on={theme.effective === 'dark'}></span>
              </button>
              <hr />
              <button role="menuitem" onclick={() => { session.signOut(); goto('/'); }}>Log out</button>
            </div>
          {/if}
        </div>
      {:else}
        <button class="icon" onclick={() => theme.toggle()} aria-label="Toggle dark mode">{theme.effective === 'dark' ? '☀' : '☾'}</button>
        <a class="btn small ghost" href={loginHref}>Log in</a>
        <a class="btn small primary" href="/signup">Sign up</a>
      {/if}
    </div>
  </div>
</header>

<style>
  .bar { position: sticky; top: 0; z-index: 30; height: var(--bar); background: var(--header); border-bottom: 1px solid var(--header-line); }
  .in { height: 100%; padding: 0 20px; display: grid; grid-template-columns: 1fr minmax(0, 640px) 1fr; align-items: center; gap: 16px; }
  .search { display: flex; align-items: center; gap: 10px; height: 40px; border-radius: 999px; padding: 0 16px; background: var(--surface-3); color: var(--ink-4); border: 1px solid transparent; }
  .search input { border: 0; outline: 0; background: transparent; flex: 1; font-size: 14px; min-width: 0; color: var(--ink); }
  .search:focus-within { background: var(--surface); border-color: var(--brand); box-shadow: 0 0 0 3px var(--brand-ring); }
  .right { display: flex; align-items: center; gap: 8px; justify-content: flex-end; }
  .create { font-weight: 600; }
  .icon { border: 0; background: none; font-size: 18px; color: var(--ink-3); cursor: pointer; width: 36px; height: 36px; border-radius: 99px; }
  .icon:hover { background: var(--surface-3); }
  .me { position: relative; }
  .avatar { border: 0; background: none; padding: 0; cursor: pointer; position: relative; display: block; }
  .avatar img { border-radius: 99px; display: block; }
  .dot { position: absolute; right: -1px; bottom: -1px; width: 12px; height: 12px; border-radius: 99px; background: var(--ok); border: 2px solid var(--header); }
  .menu { position: absolute; right: 0; top: 46px; width: 250px; padding: 8px; display: flex; flex-direction: column; box-shadow: var(--shadow); }
  .who { display: flex; gap: 10px; align-items: center; padding: 6px 8px 10px; border-bottom: 1px solid var(--line); margin-bottom: 4px; }
  .who img { border-radius: 99px; }
  .who div { display: flex; flex-direction: column; } .who small { color: var(--ink-4); }
  .menu a, .menu button { display: flex; justify-content: space-between; align-items: center; padding: 9px 10px; border-radius: 8px; font-size: 14px; text-decoration: none; background: none; border: 0; text-align: left; cursor: pointer; color: var(--ink-2); font-weight: 500; }
  .menu a:hover, .menu button:hover { background: var(--surface-3); }
  .switch { width: 34px; height: 20px; border-radius: 99px; background: var(--line-strong); position: relative; transition: 0.2s; }
  .switch::after { content: ''; position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; border-radius: 99px; background: #fff; transition: 0.2s; }
  .switch.on { background: var(--brand); } .switch.on::after { left: 16px; }
  hr { border: 0; border-top: 1px solid var(--line); margin: 4px 0; width: 100%; }
  @media (max-width: 899px) { .in { display: flex; padding: 0 12px; } .menu { position: fixed; right: 10px; top: calc(var(--bar) + 4px); } }
</style>
