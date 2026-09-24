# TinyCoup

Comics where your subscription goes to **the artists you pick**. Working name (maybe "Comics Plus" later; trademark check pending).

- Read free. Subscribe at **$2.49 per artist / month**, billed as **one** Stripe charge.
- Any subscription unlocks every premium comic; picks decide where the money goes.
- Creators keep **85%**. TinyCoup keeps 15% and pays card fees out of it.
- Desktop is an old-reddit-style three-column feed (Card / Compact / Classic, `j` `k` `x` `o` keys). Mobile is app-like with a bottom nav, installable as a PWA.

## Run it

```bash
npm install
npm run dev          # http://localhost:5173
```

With no `.env`, the site runs in **demo mode**. Seed comics are generated placeholder art, and accounts, following, likes, comments, checkout, creator onboarding and uploads all work, stored in your browser. The `DEMO MODE` chip in the top bar tells you which mode you're in.

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
5. Stripe webhook → `https://<site>/api/stripe-webhook` with events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `account.updated`.
6. `npm run deploy`

Local full-stack: `VITE_USE_EMULATORS=true` + `npm run emulators`, and `stripe listen --forward-to localhost:5001/<project>/us-central1/stripeWebhook`.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for how it fits together and what's still TODO.
