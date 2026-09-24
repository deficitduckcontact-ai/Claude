// What the LIVE site has switched on. Each needs its backend piece deployed
// first (see docs/SETUP.md). Anything off shows a friendly "coming soon" instead
// of an error. Demo mode simulates everything, so all features are on there.
import { mode } from './firebase.svelte';

export const LIVE_FEATURES = {
  accounts: true, // Firebase Auth + Firestore (free plan) — step 2
  payments: false, // Stripe + Cloud Functions (Blaze plan) — step 3
  comments: false, // postComment function — step 3
  creators: false, // Stripe Connect + upload pipeline — step 3
  selfDelete: false // deleteAccount function — step 3
};

export type Feature = keyof typeof LIVE_FEATURES;
export const on = (f: Feature) => !mode.live || LIVE_FEATURES[f];
