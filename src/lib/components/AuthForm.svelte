<script lang="ts">
  import { goto } from '$app/navigation';
  import Logo from './Logo.svelte';
  import { session } from '$lib/session.svelte';
  import { LIVE } from '$lib/firebase';

  let { mode }: { mode: 'login' | 'signup' } = $props();
  let email = $state('');
  let password = $state('');
  let handle = $state('');
  let err = $state('');
  let busy = $state(false);

  const next = () => { const n = new URLSearchParams(location.search).get('next') ?? '/'; return n.startsWith('/') && !n.startsWith('//') ? n : '/'; };
  $effect(() => { if (session.ready && session.account) goto(next(), { replaceState: true }); });

  async function submit(e: SubmitEvent) {
    e.preventDefault(); err = ''; busy = true;
    try {
      if (mode === 'signup') await session.signUp(email, password, handle);
      else await session.signIn(email, password);
    } catch (x) { err = friendly((x as Error).message); }
    busy = false;
  }
  async function google() { err = ''; try { await session.signInWithGoogle(); } catch (x) { err = friendly((x as Error).message); } }
  const friendly = (m: string) =>
    m.includes('auth/invalid-credential') || m.includes('auth/wrong-password') ? 'Email or password is incorrect'
    : m.includes('auth/email-already-in-use') ? 'That email already has an account'
    : m.includes('auth/too-many-requests') ? 'Too many tries — wait a minute and try again'
    : m.replace(/^Firebase: /, '');
</script>

<div class="auth card">
  <div class="lg"><Logo size={24} /></div>
  <h1>{mode === 'signup' ? 'Make an account' : 'Welcome back'}</h1>
  <p class="muted">{mode === 'signup' ? 'Free to read. Follow series, like, comment, and back artists when you want to.' : 'Log in to your library and your artists.'}</p>

  <button class="btn block google" onclick={google} disabled={!LIVE} title={LIVE ? '' : 'Needs Firebase configured'}>
    <svg width="16" height="16" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
    Continue with Google
  </button>
  <div class="or"><span>or</span></div>

  <form onsubmit={submit}>
    {#if mode === 'signup'}
      <div class="field"><label for="h">Handle</label><input id="h" class="input" bind:value={handle} autocomplete="username" placeholder="dinofan" required /></div>
    {/if}
    <div class="field"><label for="e">Email</label><input id="e" class="input" type="email" bind:value={email} autocomplete="email" required /></div>
    <div class="field"><label for="p">Password</label><input id="p" class="input" type="password" bind:value={password} autocomplete={mode === 'signup' ? 'new-password' : 'current-password'} minlength="8" required /></div>
    {#if err}<div class="error">{err}</div>{/if}
    <button class="btn primary big block" disabled={busy}>{busy ? '…' : mode === 'signup' ? 'Create account' : 'Log in'}</button>
  </form>

  <p class="alt">
    {#if mode === 'signup'}Already have an account? <a href="/login{typeof location !== 'undefined' ? location.search : ''}">Log in</a>
    {:else}New here? <a href="/signup{typeof location !== 'undefined' ? location.search : ''}">Make an account</a> · <a href="/reset">Forgot password</a>{/if}
  </p>
  {#if mode === 'signup'}<p class="fine faint">By signing up you agree to the <a href="/legal/terms">Terms</a> and <a href="/legal/privacy">Privacy Policy</a>.</p>{/if}
  {#if !LIVE}<div class="todo-box"><b>Demo mode:</b> accounts are stored in this browser only. Add Firebase config (.env) for real auth, email verification and Google sign-in.</div>{/if}
</div>

<style>
  .auth { max-width: 420px; margin: 40px auto; padding: 28px; }
  .lg { margin-bottom: 14px; }
  h1 { margin: 0 0 4px; font-size: 24px; }
  p.muted { margin: 0 0 18px; font-size: 14px; }
  .google { gap: 10px; }
  .or { text-align: center; margin: 14px 0; position: relative; color: var(--ink-4); font-size: 12px; }
  .or::before { content: ''; position: absolute; left: 0; right: 0; top: 50%; border-top: 1px solid var(--line); }
  .or span { background: #fff; padding: 0 10px; position: relative; }
  .alt { font-size: 13.5px; text-align: center; margin: 16px 0 6px; }
  .alt a, .fine a { color: var(--coup); font-weight: 600; }
  .fine { font-size: 12px; text-align: center; margin: 0 0 12px; }
  @media (max-width: 520px) { .auth { margin: 0; border-radius: 0; border: 0; box-shadow: none; } }
</style>
