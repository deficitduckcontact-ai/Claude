// How the site finds its backend — no keys to copy:
//   • Deployed on Firebase Hosting → reads /__/firebase/init.json (Hosting serves
//     the project's web config there automatically) → LIVE.
//   • VITE_FIREBASE_* in .env → LIVE with those settings (other hosts).
//   • VITE_USE_EMULATORS=true → LIVE against local emulators.
//   • Anything else (localhost, Codespaces) → DEMO: everything simulated in the browser.
//   • VITE_FORCE_DEMO=true → DEMO even when deployed (a pure look-and-feel preview).
import type { FirebaseApp, FirebaseOptions } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import type { FirebaseStorage } from 'firebase/storage';
import type { Functions } from 'firebase/functions';

const env = import.meta.env;
const EMULATORS = env.VITE_USE_EMULATORS === 'true';

/** Reactive: templates re-render when the mode is known. */
export const mode = $state({ resolved: false, live: false, projectId: '' });

let config: FirebaseOptions | null = null;
let resolving: Promise<void> | null = null;

export function resolveMode(): Promise<void> {
  return (resolving ??= (async () => {
    if (env.VITE_FORCE_DEMO === 'true') {
      config = null;
    } else if (EMULATORS) {
      const projectId = env.VITE_FIREBASE_PROJECT_ID || 'demo-tinycoup';
      config = { apiKey: 'emulator', projectId, authDomain: `${projectId}.firebaseapp.com`, storageBucket: `${projectId}.appspot.com`, appId: 'emulator' };
    } else if (env.VITE_FIREBASE_API_KEY && env.VITE_FIREBASE_PROJECT_ID) {
      config = {
        apiKey: env.VITE_FIREBASE_API_KEY, authDomain: env.VITE_FIREBASE_AUTH_DOMAIN, projectId: env.VITE_FIREBASE_PROJECT_ID,
        storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET, appId: env.VITE_FIREBASE_APP_ID
      };
    } else if (typeof location !== 'undefined' && !/^(localhost|127\.|0\.0\.0\.0|\[::1\])/.test(location.hostname)) {
      try {
        const res = await fetch('/__/firebase/init.json', { cache: 'no-store' });
        if (res.ok && (res.headers.get('content-type') ?? '').includes('json')) {
          const c = await res.json();
          if (c?.apiKey && c?.projectId) config = c;
        }
      } catch { /* not on Firebase Hosting → demo */ }
    }
    mode.live = !!config;
    mode.projectId = config?.projectId ?? '';
    mode.resolved = true;
  })());
}

/** Public image CDN base for derived panels. */
export function imageBase(): string {
  return env.VITE_IMAGE_BASE || (config?.storageBucket ? `https://storage.googleapis.com/${config.storageBucket}` : '');
}

export interface Fb { app: FirebaseApp; auth: Auth; db: Firestore; storage: FirebaseStorage; functions: Functions }
let cached: Promise<Fb> | null = null;

export function fb(): Promise<Fb> {
  return (cached ??= (async () => {
    await resolveMode();
    if (!config) throw new Error('Firebase not configured (demo mode)');
    const [{ initializeApp }, a, f, s, fn] = await Promise.all([
      import('firebase/app'), import('firebase/auth'), import('firebase/firestore'),
      import('firebase/storage'), import('firebase/functions')
    ]);
    const app = initializeApp(config);
    // App Check: proves requests come from this site, not a script. Needs a
    // reCAPTCHA Enterprise site key; functions enforce it when ENFORCE_APP_CHECK=true.
    if (env.VITE_RECAPTCHA_SITE_KEY && !EMULATORS) {
      const { initializeAppCheck, ReCaptchaEnterpriseProvider } = await import('firebase/app-check');
      initializeAppCheck(app, { provider: new ReCaptchaEnterpriseProvider(env.VITE_RECAPTCHA_SITE_KEY), isTokenAutoRefreshEnabled: true });
    }
    const out: Fb = {
      app,
      auth: a.getAuth(app),
      db: f.getFirestore(app),
      storage: s.getStorage(app),
      functions: fn.getFunctions(app, 'us-central1')
    };
    if (EMULATORS) {
      a.connectAuthEmulator(out.auth, 'http://127.0.0.1:9099', { disableWarnings: true });
      f.connectFirestoreEmulator(out.db, '127.0.0.1', 8080);
      s.connectStorageEmulator(out.storage, '127.0.0.1', 9199);
      fn.connectFunctionsEmulator(out.functions, '127.0.0.1', 5001);
    }
    return out;
  })());
}

export async function call<T = unknown>(name: string, data: unknown): Promise<T> {
  const { functions } = await fb();
  const { httpsCallable } = await import('firebase/functions');
  return (await httpsCallable(functions, name)(data)).data as T;
}
