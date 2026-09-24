// Who is here, what they follow/like/read, and their subscription.
// DEMO mode: everything persists to localStorage so the full flow works
// without a backend. LIVE mode: Firebase Auth + Firestore (rules enforce
// that subscription state is only ever written by Cloud Functions).
import { LIVE, fb } from './firebase';
import { SEED_NOW } from './seed';
import type { Account, Density, SortMode, Subscription } from './types';

const KEY = 'tc:session';
const browser = typeof window !== 'undefined';

interface Persisted {
  account: Account | null;
  follows: string[];
  likes: string[];
  reads: string[];
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
      this.density = p.density ?? (matchMedia('(min-width: 900px)').matches ? 'compact' : 'card');
      this.sort = p.sort ?? 'hot';
      if (!LIVE) {
        this.account = p.account ?? null;
        this.follows = p.follows ?? [];
        this.likes = p.likes ?? [];
        this.reads = p.reads ?? [];
        this.sub = p.sub ?? EMPTY_SUB;
        this.#users = p.users ?? {};
      }
    } catch { /* corrupted storage: start clean */ }
    if (LIVE) this.#watchAuth(); else this.ready = true;
  }

  save() {
    if (!browser) return;
    const p: Persisted = LIVE
      ? { account: null, follows: [], likes: [], reads: [], sub: EMPTY_SUB, density: this.density, sort: this.sort }
      : { account: this.account, follows: this.follows, likes: this.likes, reads: this.reads, sub: this.sub, density: this.density, sort: this.sort, users: this.#users };
    try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* quota */ }
  }

  // ---------------- auth ----------------
  async signUp(email: string, password: string, handle: string) {
    handle = handle.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,24}$/.test(handle)) throw new Error('Handle: 3–24 letters, numbers or _');
    if (password.length < 8) throw new Error('Password must be at least 8 characters');
    if (!LIVE) {
      if (this.#users?.[email]) throw new Error('That email already has an account');
      const account: Account = { uid: 'demo-' + crypto.randomUUID().slice(0, 8), handle, displayName: handle, email, isCreator: false };
      this.#users = { ...this.#users, [email]: { pw: password, account } }; // DEMO ONLY — never store passwords like this for real
      this.account = account;
      return this.save();
    }
    const { auth, db } = await fb();
    const a = await import('firebase/auth');
    const f = await import('firebase/firestore');
    const cred = await a.createUserWithEmailAndPassword(auth, email, password);
    await a.updateProfile(cred.user, { displayName: handle });
    // TODO(live): enforce handle uniqueness with a `handles/{handle}` doc in a transaction (or a callable).
    await f.setDoc(f.doc(db, 'users', cred.user.uid), { handle, displayName: handle, createdAt: f.serverTimestamp() });
    await a.sendEmailVerification(cred.user).catch(() => {});
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
    // TODO(live): first Google sign-in has no users/{uid} doc — route to /welcome to pick a handle.
  }

  async resetPassword(email: string) {
    if (!LIVE) throw new Error('Password reset emails need Firebase configured');
    const { auth } = await fb();
    const a = await import('firebase/auth');
    await a.sendPasswordResetEmail(auth, email);
  }

  async signOut() {
    if (LIVE) { const { auth } = await fb(); await (await import('firebase/auth')).signOut(auth); }
    this.account = null; this.follows = []; this.likes = []; this.reads = []; this.sub = EMPTY_SUB;
    this.save();
  }

  /** Demo helper so the creator studio is reachable. Live: creatorOnboard callable sets a custom claim. */
  setCreator(on: boolean) {
    if (!this.account) return;
    this.account = { ...this.account, isCreator: on };
    const email = this.account.email;
    if (this.#users?.[email]) this.#users[email].account = this.account;
    this.save();
  }

  // ---------------- social ----------------
  async toggleFollow(slug: string) { await this.#toggle('follows', slug); }
  async toggleLike(key: string) { await this.#toggle('likes', key); }
  markRead(key: string) {
    if (this.reads.includes(key)) return;
    this.reads = [key, ...this.reads].slice(0, 2000);
    this.save();
    if (LIVE && this.account) this.#write('reads', key, true);
  }

  setSub(sub: Subscription) { this.sub = sub; this.save(); }

  async #toggle(list: 'follows' | 'likes', id: string) {
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

  async #watchAuth() {
    const { auth, db } = await fb();
    const a = await import('firebase/auth');
    const f = await import('firebase/firestore');
    let unsubSub: (() => void) | null = null;
    a.onAuthStateChanged(auth, async (user) => {
      unsubSub?.(); unsubSub = null;
      if (!user) { this.account = null; this.follows = []; this.likes = []; this.sub = EMPTY_SUB; this.ready = true; return; }
      const token = await user.getIdTokenResult();
      const prof = (await f.getDoc(f.doc(db, 'users', user.uid))).data();
      this.account = {
        uid: user.uid, email: user.email ?? '', handle: prof?.handle ?? user.uid.slice(0, 8),
        displayName: prof?.displayName ?? user.displayName ?? '', isCreator: token.claims.creator === true
      };
      const ids = async (c: string) => (await f.getDocs(f.collection(db, 'users', user.uid, c))).docs.map((d) => d.id);
      [this.follows, this.likes] = await Promise.all([ids('follows'), ids('likes')]);
      unsubSub = f.onSnapshot(f.doc(db, 'subscriptions', user.uid), (d) => {
        const x = d.data();
        this.sub = x ? { status: x.status, picks: x.picks ?? [], currentPeriodEnd: x.currentPeriodEnd?.toMillis?.(), since: x.since?.toMillis?.() } : EMPTY_SUB;
      });
      this.ready = true;
    });
  }
}

export const session = new Session();
