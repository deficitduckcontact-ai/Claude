# TinyCoup

Comics where your subscription goes to **the artists you pick**. Working name (maybe "Comics Plus" later; trademark check pending).

- Read free. Subscribe at **$2.49 per artist / month**, billed as **one** Stripe charge.
- Any subscription unlocks every premium comic; picks decide where the money goes.
- Creators keep **85%**. TinyCoup keeps 15% and pays card fees out of it.
- The design is new-reddit / Tinyview-style (left nav, card feed, right sidebar), with the look of the "changing subscriptions" mockup and a Facebook-blue brand, plus dark mode.
- It's an **installable app** (PWA): Add to Home Screen on iPhone, or Install on Android/desktop. Nothing depends on GitHub at runtime.

## Put it online

**Follow [docs/SETUP.md](docs/SETUP.md).** It takes about 15 minutes, needs no domain name, and gives you real accounts on a free `*.web.app` address.

## Run it

```bash
npm install
npm run dev          # http://localhost:5173
```

On your own computer the site runs in **demo mode**. Once deployed on Firebase Hosting it connects to its project automatically, with no keys to copy (see `src/lib/firebase.svelte.ts`). Seed comics are generated placeholder art, and accounts, following, likes, comments, checkout, creator onboarding and uploads all work, stored in your browser. The `DEMO MODE` chip in the top bar tells you which mode you're in.

```bash
npm test             # pricing/split tests
npm run check        # svelte-check + TypeScript
npm run build        # prerenders every series/episode page into build/
```

## Go live (Firebase + Stripe)

1. Create a Firebase project (Blaze plan: Functions and Storage need it). Enable Auth (Email/Password and Google), Firestore and Storage.
2. `cp .env.example .env` and fill in the web config. Update `.firebaserc` with the project id.
3. Stripe: create a Product "Artist subscription" with a **$2.49 / month recurring price**. Turn on Connect (Express) and the Customer Portal.
4. Functions config:
   ```bash
   cd functions && npm install && cd ..
   firebase functions:secrets:set STRIPE_SECRET_KEY
   firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
   # functions/.env
   STRIPE_PRICE_MONTHLY=price_...
   ALLOWED_ORIGINS=https://tinycoup.web.app,http://localhost:5173
   ```
5. Stripe webhook → `https://<site>/api/stripe-webhook` with events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `charge.refunded`, `charge.dispute.created`, `charge.dispute.closed`, `account.updated`.
6. Bot protection:
   - Upgrade Firebase Auth to **Identity Platform** (free for the first 50k monthly users). The `screenSignup` blocking function needs it, and it blocks throwaway emails.
   - Create a **reCAPTCHA Enterprise** key, register it in Firebase **App Check**, and put it in `VITE_RECAPTCHA_SITE_KEY`.
   - Once the site sends tokens, set `ENFORCE_APP_CHECK=true` in `functions/.env` and enforce App Check for Firestore/Storage in the console.
   - Turn on **email enumeration protection** in Auth settings.
7. Fill in the `[brackets]` on the `/legal/*` pages, register a DMCA agent, and have a lawyer review them.
8. Give yourself moderator powers: `firebase auth:export` your uid, then set the custom claim `{ mod: true }` (Admin SDK).
9. `npm run deploy`. It refuses to deploy demo mode unless `VITE_ALLOW_DEMO=true`.

Local full-stack: `VITE_USE_EMULATORS=true` + `npm run emulators`, and `stripe listen --forward-to localhost:5001/<project>/us-central1/stripeWebhook`.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for how it fits together and what's still TODO.
