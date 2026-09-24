<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import Logo from './Logo.svelte';
  import SeriesBar from './SeriesBar.svelte';
  import { session } from '$lib/session.svelte';
  import { avatarArt } from '$lib/art';
  import { LIVE } from '$lib/firebase';
  import { theme } from '$lib/theme.svelte';

  let q = $state('');
  let menu = $state(false);
  const search = (e: SubmitEvent) => { e.preventDefault(); goto(`/search?q=${encodeURIComponent(q)}`); };
  const on = (p: string) => (p === '/' ? page.url.pathname === '/' : page.url.pathname.startsWith(p));
  const loginHref = $derived(`/login?next=${encodeURIComponent(page.url.pathname)}`);
</script>

<svelte:window onclick={() => (menu = false)} />

<SeriesBar />
<header class="bar">
  <div class="in">
    <Logo />
    <nav class="links desk-only">
      <a href="/" class:on={on('/')}>front</a>
      <a href="/series" class:on={on('/series')}>all series</a>
      <a href="/how-it-works" class:on={on('/how-it-works')}>how it works</a>
      <a href="/creators" class:on={on('/creators')}>for creators</a>
    </nav>
    <form class="search desk-only" onsubmit={search} role="search">
      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#8a8d91" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>
      <input bind:value={q} placeholder="Search TinyCoup" aria-label="Search" />
    </form>
    <div class="grow"></div>
    {#if !LIVE}<span class="chip todo desk-only" title="No Firebase config — accounts, uploads and payments are simulated in this browser">DEMO MODE</span>{/if}

    <!-- desktop: old-reddit style account links -->
    <div class="acct desk-only">
      {#if session.account}
        <a href="/me" class="who"><img src={avatarArt(session.account.handle)} alt="" width="22" height="22" />{session.account.handle}</a>
        {#if session.subscribed}<span class="faint">(backing {session.sub.picks.length})</span>{/if}
        <span class="sep">|</span><a href="/me/plan">{session.subscribed ? 'my artists' : 'subscribe'}</a>
        <span class="sep">|</span><a href="/studio">{session.isCreator ? 'studio' : 'create'}</a>
        <span class="sep">|</span><a href="/me/settings">preferences</a>
        <span class="sep">|</span><button onclick={() => theme.toggle()}>{theme.effective === 'dark' ? 'day mode' : 'night mode'}</button>
        <span class="sep">|</span><button onclick={() => { session.signOut(); goto('/'); }}>logout</button>
      {:else}
        <span class="faint">Want to join?</span> <a href={loginHref}>Log in</a> <span class="faint">or</span> <a href="/signup">sign up</a> <span class="faint">in seconds.</span>
        <span class="sep">|</span><button onclick={() => theme.toggle()} aria-label="Toggle night mode">{theme.effective === 'dark' ? '☀' : '☾'}</button>
      {/if}
    </div>

    <!-- phone: compact -->
    <div class="mob-only">
      <button class="moon" onclick={() => theme.toggle()} aria-label="Toggle night mode">{theme.effective === 'dark' ? '☀' : '☾'}</button>
      {#if session.account}
        <div class="me">
          <button class="avatar" onclick={(e) => { e.stopPropagation(); menu = !menu; }} aria-haspopup="menu" aria-expanded={menu} aria-label="Account menu">
            <img src={avatarArt(session.account.handle)} alt="" width="32" height="32" />
          </button>
          {#if menu}
            <div class="menu card" role="menu">
              <a href="/me" role="menuitem">Profile & library</a>
              <a href="/me/plan" role="menuitem">My artists</a>
              <a href="/me/billing" role="menuitem">Billing</a>
              <a href="/studio" role="menuitem">{session.isCreator ? 'Creator studio' : 'Become a creator'}</a>
              <a href="/me/settings" role="menuitem">Settings</a>
              <button role="menuitem" onclick={() => { session.signOut(); goto('/'); }}>Sign out</button>
            </div>
          {/if}
        </div>
      {:else}
        <a class="btn small ghost" href={loginHref}>Log in</a>
        <a class="btn small primary" href="/signup">Sign up</a>
      {/if}
    </div>
  </div>
</header>

<style>
  .bar { position: sticky; top: 0; z-index: 30; height: var(--bar); background: var(--header); border-bottom: 1px solid var(--header-line); }
  .in { height: 100%; padding: 0 16px; display: flex; align-items: center; gap: 14px; }
  .links { display: flex; gap: 2px; font-family: var(--classic); font-size: 12px; }
  .links a { padding: 4px 8px; color: var(--link); text-decoration: none; border-radius: 4px; }
  .links a:hover { text-decoration: underline; }
  .links a.on { font-weight: 700; color: var(--ink); }
  .search { display: flex; align-items: center; gap: 8px; width: 320px; max-width: 28vw; height: 34px; border: 1px solid var(--header-line); border-radius: 999px; padding: 0 12px; background: var(--surface); }
  .search input { border: 0; outline: 0; background: transparent; flex: 1; font-size: 13.5px; min-width: 0; }
  .search:focus-within { border-color: var(--brand); box-shadow: 0 0 0 3px var(--brand-ring); }
  .acct { font-family: var(--classic); font-size: 11px; display: flex; align-items: center; gap: 5px; white-space: nowrap; }
  .acct a, .acct button { color: var(--link); background: none; border: 0; padding: 0; font: inherit; cursor: pointer; text-decoration: none; }
  .acct a:hover, .acct button:hover { text-decoration: underline; }
  .acct .who { display: inline-flex; align-items: center; gap: 5px; font-weight: 700; color: var(--ink-2); }
  .acct .who img { border-radius: 99px; }
  .sep { color: var(--header-sep); }
  .me { position: relative; }
  .moon { border: 0; background: none; font-size: 18px; color: var(--ink-3); cursor: pointer; padding: 4px 6px; }
  .avatar { border: 0; background: none; padding: 0; cursor: pointer; }
  .avatar img { border-radius: 99px; }
  .menu { position: absolute; right: 0; top: 42px; width: 220px; padding: 6px; display: flex; flex-direction: column; box-shadow: var(--shadow); }
  .menu a, .menu button { padding: 10px; border-radius: 6px; font-size: 14.5px; text-decoration: none; background: none; border: 0; text-align: left; cursor: pointer; color: var(--ink-2); }
  .menu a:hover, .menu button:hover { background: var(--page); }
  @media (max-width: 899px) { .bar { background: var(--surface); border-bottom-color: var(--line); } .in { gap: 8px; } .mob-only { display: flex; align-items: center; gap: 6px; } }
</style>
