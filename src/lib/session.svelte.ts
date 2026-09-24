// Who is here, what they follow/like/read, and their subscription.
// DEMO mode: everything persists to localStorage so the full flow works
// without a backend. LIVE mode: Firebase Auth + Firestore (rules enforce
// that subscription state is only ever written by Cloud Functions).
import { LIVE, fb } from './firebase';
import { SEED_NOW } from './seed';
import { isDisposableEmail } from '../../functions/src/spam';
import type { Account, Creator, Density, Series, SortMode, Subscription } from './types';

const KEY = 'tc:session';
const browser = typeof window !== 'undefined';

interface Persisted {
  account: Account | null;
  follows: string[];
  likes: string[];
  reads: string[];
  saved?: string[];
  hidden?: string[];
  sub: Subscription;
  density: Density;
  sort: SortMode;
  users?: Record<string, { pw: string; account: Account }>; // demo-only fake auth
}

const EMPTY_SUB: Subscription = { status: 'none', picks: [] };

class Session {
  ready = $state(false);
  localRev = $state(0); // bumped when demo-mode content is saved locally
  now = $state(SEED_NOW);
  account = $state<Account | null>(null);
  follows = $state<string[]>([]);
  likes = $state<string[]>([]);
  reads = $state<string[]>([]);
  saved = $state<string[]>([]);
  hidden = $state<string[]>([]);
  // Live mode: series/creators created after the last build (merged over seed data).
  liveSeries = $state<Series[]>([]);
  liveCreators = $state<Creator[]>([]);
  sub = $state<Subscription>(EMPTY_SUB);
  density = $state<Density>('compact');
  sort = $state<SortMode>('hot');
  #users: Persisted['users'] = {};

  get subscribed() { return this.sub.status === 'active' || this.sub.status === 'past_due'; }
  get isCreator() { return !!this.account?.isCreator; }

  init() {
    if (!browser || this.ready) return;
    this.now = Date.now();
    setInterval(() => (this.now = Date.now()), 60_000);
    try {
      const p: Partial<Persisted> = JSON.parse(localStorage.getItem(KEY) ?? '{}');
      // Desktop defaults to the old-reddit "classic" list; phones to big cards.
      this.density = p.density ?? (matchMedia('(min-width: 900px)').matches ? 'classic' : 'card');
      this.sort = p.sort ?? 'hot';
      if (!LIVE) {
        this.account = p.account ?? null;
        this.follows = p.follows ?? [];
        this.likes = p.likes ?? [];
        this.reads = p.reads ?? [];
        this.saved = p.saved ?? [];
        this.hidden = p.hidden ?? [];
        this.sub = p.sub ?? EMPTY_SUB;
        this.#users = p.users ?? {};
      }
    } catch { /* corrupted storage: start clean */ }
    if (LIVE) { this.#watchAuth(); this.#loadCatalog(); } else this.ready = true;
  }

  save() {
    if (!browser) return;
    const p: Persisted = LIVE
      ? { account: null, follows: [], likes: [], reads: [], sub: EMPTY_SUB, density: this.density, sort: this.sort }
      : { account: this.account, follows: this.follows, likes: this.likes, reads: this.reads, saved: this.saved, hidden: this.hidden, sub: this.sub, density: this.density, sort: this.sort, users: this.#users };
    try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* quota */ }
  }

  // ---------------- auth ----------------
  async signUp(email: string, password: string, handle: string) {
    handle = handle.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,24}$/.test(handle)) throw new Error('Handle: 3–24 letters, numbers or _');
    if (password.length < 8) throw new Error('Password must be at least 8 characters');
    if (isDisposableEmail(email)) throw new Error('Please use a permanent email address');
    if (!LIVE) {
      if (this.#users?.[email]) throw new Error('That email already has an account');
      const account: Account = { uid: 'demo-' + crypto.randomUUID().slice(0, 8), handle, displayName: handle, email, emailVerified: false, isCreator: false };
      this.#users = { ...this.#users, [email]: { pw: password, account } }; // DEMO ONLY — never store passwords like this for real
      this.account = account;
      return this.save();
    }
    const { auth, db } = await fb();
    const a = await import('firebase/auth');
    const f = await import('firebase/firestore');
    if ((await f.getDoc(f.doc(db, 'handles', handle))).exists()) throw new Error('That handle is taken');
    const cred = await a.createUserWithEmailAndPassword(auth, email, password);
    await a.updateProfile(cred.user, { displayName: handle });
    await this.#claimProfile(cred.user.uid, handle);
    await a.sendEmailVerification(cred.user).catch(() => {});
  }

  /** Re-send the verification email (live) or simulate clicking it (demo). */
  async verifyEmail() {
    if (!this.account) return;
    if (!LIVE) { this.#updateAccount({ emailVerified: true }); return 'Verified (demo).'; }
    const { auth } = await fb();
    const a = await import('firebase/auth');
    await auth.currentUser?.reload();
    if (auth.currentUser?.emailVerified) {
      await auth.currentUser.getIdToken(true); // so functions see email_verified=true
      this.account = { ...this.account, emailVerified: true };
      return 'Thanks — your email is verified.';
    }
    await a.sendEmailVerification(auth.currentUser!);
    return 'Sent! Check your inbox, click the link, then come back here.';
  }

  #updateAccount(patch: Partial<Account>) {
    if (!this.account) return;
    this.account = { ...this.account, ...patch };
    const email = this.account.email;
    if (this.#users?.[email]) this.#users[email].account = this.account;
    this.save();
  }

  async signIn(email: string, password: string) {
    if (!LIVE) {
      const u = this.#users?.[email];
      if (!u || u.pw !== password) throw new Error('Email or password is incorrect');
      this.account = u.account;
      return this.save();
    }
    const { auth } = await fb();
    const a = await import('firebase/auth');
    await a.signInWithEmailAndPassword(auth, email, password);
  }

  async signInWithGoogle() {
    if (!LIVE) throw new Error('Google sign-in needs Firebase configured (see .env.example)');
    const { auth } = await fb();
    const a = await import('firebase/auth');
    await a.signInWithPopup(auth, new a.GoogleAuthProvider());
    // First Google sign-in: #watchAuth creates a profile with a generated handle.
    // TODO: a /welcome step to let them choose it.
  }

  /** Claim handles/{handle} and create users/{uid} in one batch (rules check both). */
  async #claimProfile(uid: string, handle: string) {
    const { db } = await fb();
    const f = await import('firebase/firestore');
    const b = f.writeBatch(db);
    b.set(f.doc(db, 'handles', handle), { uid });
    b.set(f.doc(db, 'users', uid), { handle, displayName: handle, createdAt: f.serverTimestamp() });
    await b.commit(); // fails if the handle was taken in the meantime
  }

  async resetPassword(email: string) {
    if (!LIVE) throw new Error('Password reset emails need Firebase configured');
    const { auth } = await fb();
    const a = await import('firebase/auth');
    await a.sendPasswordResetEmail(auth, email);
  }

  async signOut() {
    if (LIVE) { const { auth } = await fb(); await (await import('firebase/auth')).signOut(auth); }
    this.account = null; this.follows = []; this.likes = []; this.reads = []; this.saved = []; this.hidden = []; this.sub = EMPTY_SUB;
    this.save();
  }

  /** Demo helper so the creator studio is reachable. Live: creatorOnboard callable sets a custom claim. */
  setCreator(on: boolean) { this.#updateAccount({ isCreator: on }); }

  /** Demo-mode account deletion (live mode uses the deleteAccount callable). */
  forgetDemoAccount() {
    if (!this.account) return;
    const { [this.account.email]: _, ...rest } = this.#users ?? {};
    this.#users = rest;
  }

  // ---------------- social ----------------
  async toggleFollow(slug: string) { await this.#toggle('follows', slug); }
  async toggleLike(key: string) { await this.#toggle('likes', key); }
  async toggleSave(key: string) { await this.#toggle('saved', key); }
  async toggleHide(key: string) { await this.#toggle('hidden', key); }
  markRead(key: string) {
    if (this.reads.includes(key)) return;
    this.reads = [key, ...this.reads].slice(0, 2000);
    this.save();
    if (LIVE && this.account) this.#write('reads', key, true);
  }

  setSub(sub: Subscription) { this.sub = sub; this.save(); }

  async #toggle(list: 'follows' | 'likes' | 'saved' | 'hidden', id: string) {
    const on = !this[list].includes(id);
    this[list] = on ? [id, ...this[list]] : this[list].filter((x) => x !== id);
    this.save();
    // Counters (followers, likes) are aggregated by functions — clients never write them.
    if (LIVE && this.account) await this.#write(list, id, on);
  }

  async #write(col: string, id: string, on: boolean) {
    const { db } = await fb();
    const f = await import('firebase/firestore');
    const ref = f.doc(db, 'users', this.account!.uid, col, id);
    await (on ? f.setDoc(ref, { at: f.serverTimestamp() }) : f.deleteDoc(ref));
  }

  /** Live mode: series + creators from Firestore (prerendered pages only know the seed). */
  async #loadCatalog() {
    try {
      const { db } = await fb();
      const f = await import('firebase/firestore');
      const [ss, cs] = await Promise.all([
        f.getDocs(f.query(f.collection(db, 'series'), f.limit(500))),
        f.getDocs(f.query(f.collection(db, 'creators'), f.limit(1000)))
      ]);
      const hue = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);
      this.liveSeries = ss.docs.map((d) => {
        const x = d.data();
        return { slug: d.id, title: x.title, tagline: x.tagline ?? '', about: x.about ?? '', creatorUids: x.creatorIds ?? [], hue: hue(d.id), followers: x.followers ?? 0, tags: x.tags ?? [], schedule: x.schedule };
      });
      this.liveCreators = cs.docs.map((d) => ({ uid: d.id, name: d.get('displayName') || d.get('handle') || 'Creator', handle: d.get('handle') ?? d.id, bio: d.get('bio') }));
      // TODO(scale): past a few hundred series, load on demand instead of all at boot.
    } catch { /* offline: seed data still works */ }
  }

  async #watchAuth() {
    const { auth, db } = await fb();
    const a = await import('firebase/auth');
    const f = await import('firebase/firestore');
    let unsubSub: (() => void) | null = null;
    a.onAuthStateChanged(auth, async (user) => {
      unsubSub?.(); unsubSub = null;
      if (!user) { this.account = null; this.follows = []; this.likes = []; this.sub = EMPTY_SUB; this.ready = true; return; }
      // Force-refresh after Stripe onboarding so the new `creator` claim shows up.
      const token = await user.getIdTokenResult(location.search.includes('onboarded'));
      let prof = (await f.getDoc(f.doc(db, 'users', user.uid))).data();
      if (!prof) {
        // e.g. first Google sign-in: generate a free handle from the email.
        const base = (user.email ?? 'reader').split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 16).padEnd(3, '0');
        for (let i = 0; i < 5 && !prof; i++) {
          const handle = i ? `${base}${Math.floor(Math.random() * 9000 + 1000)}` : base;
          try { await this.#claimProfile(user.uid, handle); prof = { handle, displayName: user.displayName ?? handle }; } catch { /* taken, retry */ }
        }
      }
      this.account = {
        uid: user.uid, email: user.email ?? '', emailVerified: user.emailVerified, handle: prof?.handle ?? user.uid.slice(0, 8),
        displayName: prof?.displayName ?? user.displayName ?? '', isCreator: token.claims.creator === true
      };
      const ids = async (c: string) => (await f.getDocs(f.collection(db, 'users', user.uid, c))).docs.map((d) => d.id);
      [this.follows, this.likes, this.saved, this.hidden] = await Promise.all([ids('follows'), ids('likes'), ids('saved'), ids('hidden')]);
      // TODO(scale): `reads` grows forever — keep only the last ~500 and load lazily.
      unsubSub = f.onSnapshot(f.doc(db, 'subscriptions', user.uid), (d) => {
        const x = d.data();
        this.sub = x ? { status: x.status, picks: x.picks ?? [], currentPeriodEnd: x.currentPeriodEnd?.toMillis?.(), since: x.since?.toMillis?.() } : EMPTY_SUB;
      });
      this.ready = true;
    });
  }
}

export const session = new Session();
