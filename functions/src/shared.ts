import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { HttpsError, type CallableRequest } from 'firebase-functions/v2/https';
import { defineSecret, defineString } from 'firebase-functions/params';
import Stripe from 'stripe';

initializeApp();
export const db = getFirestore();
export const auth = getAuth();
export const bucket = () => getStorage().bucket();

// Set with: firebase functions:secrets:set STRIPE_SECRET_KEY  (and STRIPE_WEBHOOK_SECRET)
export const STRIPE_SECRET_KEY = defineSecret('STRIPE_SECRET_KEY');
export const STRIPE_WEBHOOK_SECRET = defineSecret('STRIPE_WEBHOOK_SECRET');
// The single recurring "artist subscription" price ($2.49/month). Quantity = number of picks.
export const STRIPE_PRICE_MONTHLY = defineString('STRIPE_PRICE_MONTHLY');
// Comma-separated origins allowed for Checkout/Portal return URLs.
export const ALLOWED_ORIGINS = defineString('ALLOWED_ORIGINS', { default: 'http://localhost:5173,http://127.0.0.1:5000' });

let stripeClient: Stripe | null = null;
export const stripe = () => (stripeClient ??= new Stripe(STRIPE_SECRET_KEY.value()));

export function requireUser(req: CallableRequest): string {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Sign in first');
  return req.auth.uid;
}
export function requireCreator(req: CallableRequest): string {
  const uid = requireUser(req);
  if (req.auth!.token.creator !== true) throw new HttpsError('permission-denied', 'Creators only');
  return uid;
}
export function safeOrigin(origin: unknown): string {
  const allowed = ALLOWED_ORIGINS.value().split(',').map((s) => s.trim());
  if (typeof origin === 'string' && allowed.includes(origin)) return origin;
  return allowed[0];
}
export async function validPicks(picks: unknown): Promise<string[]> {
  if (!Array.isArray(picks) || !picks.length || picks.length > 40 || !picks.every((p) => typeof p === 'string'))
    throw new HttpsError('invalid-argument', 'Pick between 1 and 40 artists');
  const unique = [...new Set(picks as string[])];
  const docs = await db.getAll(...unique.map((s) => db.doc(`series/${s}`)));
  const missing = docs.filter((d) => !d.exists).map((d) => d.id);
  if (missing.length) throw new HttpsError('invalid-argument', `Unknown series: ${missing.join(', ')}`);
  return unique;
}
