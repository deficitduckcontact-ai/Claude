// Firebase is loaded lazily and only when configured. With no config the
// whole site runs in DEMO mode (see session.svelte.ts) so it works today.
import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import type { FirebaseStorage } from 'firebase/storage';
import type { Functions } from 'firebase/functions';

const env = import.meta.env;
const config = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  appId: env.VITE_FIREBASE_APP_ID
};

export const LIVE = Boolean(config.apiKey && config.projectId);
export const IMAGE_BASE: string =
  env.VITE_IMAGE_BASE || (config.storageBucket ? `https://storage.googleapis.com/${config.storageBucket}` : '');

export interface Fb { app: FirebaseApp; auth: Auth; db: Firestore; storage: FirebaseStorage; functions: Functions }
let cached: Promise<Fb> | null = null;

export function fb(): Promise<Fb> {
  if (!LIVE) return Promise.reject(new Error('Firebase not configured (demo mode)'));
  return (cached ??= (async () => {
    const [{ initializeApp }, a, f, s, fn] = await Promise.all([
      import('firebase/app'), import('firebase/auth'), import('firebase/firestore'),
      import('firebase/storage'), import('firebase/functions')
    ]);
    const app = initializeApp(config);
    // App Check: proves requests come from this site, not a script. Needs a
    // reCAPTCHA Enterprise site key; functions enforce it when ENFORCE_APP_CHECK=true.
    if (env.VITE_RECAPTCHA_SITE_KEY && env.VITE_USE_EMULATORS !== 'true') {
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
    if (env.VITE_USE_EMULATORS === 'true') {
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
