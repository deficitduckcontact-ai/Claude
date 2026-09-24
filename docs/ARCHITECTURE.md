# TinyCoup architecture

## Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | SvelteKit 2 + Svelte 5, `adapter-static` | Every series/episode is **prerendered to real HTML**, so pages are indexable and shared links get proper previews. No SSR server: nothing to scale or cold-start. |
| Hosting | Firebase Hosting | CDN edge; `200.html` fallback serves pages published after the last build (rendered client-side from Firestore). |
| Data | Firestore | Public reads straight from the client; anything touching money or counters is written only by Functions. |
| Images | Cloud Storage + `sharp` in Functions | Content-hashed, immutable, cache forever. |
| Money | Stripe Billing + Checkout + Customer Portal + Connect Express | One subscription per reader; per-invoice transfers to creators. |

The UI lineage is the "changing subscriptions" mockup (`changing-subscriptions.web.app`), set in a new-reddit / current-Tinyview layout with a Facebook-style blue (`#1877F2`) on Facebook's `#F0F2F5` grey.
- **From the mockup:** soft 12–16px cards, cream → mint "what you pay → what artists get" pills, uppercase micro-labels, serif-italic subtitles, the tile picker and its sticky money footer, green ✓ reassurances.
- **From new reddit / Tinyview:** a white top bar with centred search, left nav (feeds + your series), post cards with pill action buttons, a right sidebar of cards, and community-style series pages (banner, big avatar, stats, tabs).
- **Layouts:** Card (default), Compact and Classic, plus keyboard shortcuts (`j k x o l s h f n p ?`).
- **Dark mode:** follows the device by default; toggle it from the avatar menu.

## Not tied to GitHub

GitHub only stores the source code. At runtime the app is:
- static files (the `build/` folder) on any static host (Firebase Hosting today; Cloudflare Pages or Netlify work unchanged)
- Firebase for accounts, data, files and functions
- Stripe for money

`.devcontainer/` is an optional Codespaces convenience. Delete it and nothing changes.

## Installable app (PWA)

`static/manifest.webmanifest`, PNG icons in `static/icons/`, and `src/service-worker.ts` (network-first pages, cache-first hashed assets, cache-first immutable free panels capped at 300; Firebase, Stripe and signed premium URLs are never cached). Readers install it with **Add to Home Screen** (iPhone) or **Install app** (Android and desktop Chrome/Edge). It opens full-screen with its own icon, and store fees don't apply.
TODO: a native App Store build (e.g. Capacitor) only if you accept Apple/Google taking 15–30% of in-app subscriptions, or link out to the website for payment where the rules allow.

## Money flow

```
reader picks N series ──► Stripe Checkout: price $2.49 × quantity N (one charge)
                                   │
            invoice.paid webhook ──┤  split(): 85% of gross → creator pool
                                   │  pool ÷ N picks (± 1¢ fairness), ÷ co-creators
                                   ├─► transfers.create(source_transaction = charge,
                                   │     idempotencyKey = invoice:creator)  per creator
                                   └─► ledger/{invoice}_{creator}  (+ _platform row)
```

- `src/lib/pricing.ts` is the only place the maths lives. `functions/src/split.ts` is a copy, and a test fails if they drift.
- Changing picks = changing subscription **quantity** (Stripe prorates). Picks are stored in `subscriptions/{uid}` and read when each invoice is paid.
- On a single $2.49 pick TinyCoup nets ~$0.00 after the card fee. That's intentional (not for profit). Bundles fund the infrastructure.
- **Creator earnings are held 30 days.** `invoice.paid` writes `pending` ledger rows with `releaseAt = +30d`. The daily `releasePayouts` job sends one transfer per creator once their due balance is ≥ $10 and they've finished onboarding. Refunds reduce pending rows (or reverse paid transfers). Disputes freeze rows; a lost dispute voids them, a won one releases them.

## Images (1600 retina, done right)

`publishEpisode` (callable, 2 GiB):
master → auto-orient → sRGB → strip metadata → **AVIF + WebP @ 1600 and 800**, WebP thumb @ 400 → `p/{sha256}-{w}.{ext}` with `Cache-Control: public, max-age=31536000, immutable`.
The reader uses `<picture>` with AVIF first, `srcset 800w/1600w`, explicit width/height, `fetchpriority=high` on panel 1, and lazy loading below.
Premium panels after the free preview go to `premium/` (no public read) and are served by `premiumPanels` as 15-minute signed URLs.

Cost: egress is the whole bill. Once there's a domain, put Cloudflare (or bunny/R2) in front of `p/` and set `VITE_IMAGE_BASE`.

## Data model

```
users/{uid}                 handle, displayName, avatar       (owner writes)
  follows/{slug}  likes/{slug__epId}  reads/{…}               (owner writes)
  private/stripe            customerId                        (functions)
subscriptions/{uid}         status, picks[], currentPeriodEnd (functions ← Stripe)
creators/{uid}              connectAccountId, payoutsEnabled  (functions)
series/{slug}               title, tagline, creatorIds[], followers, episodeCount
  episodes/{ep-N}           status, number, title, premium, panels[] | preview + panelCount,
                            likes, comments, views, hot, publishedAt
    private/panels          premium panel paths               (functions only)
    comments/{id}           uid, handle, body                 (signed-in create)
ledger/{invoice_creator}    per-creator payout rows           (functions; creator can read own)
stripeEvents/{eventId}      webhook idempotency               (functions)
```

Counters (likes, followers, comments) are incremented by Firestore triggers, never by clients. Hot score is recomputed every 15 minutes.

## Demo mode

`LIVE = Boolean(VITE_FIREBASE_API_KEY && VITE_FIREBASE_PROJECT_ID)`. When false, `session.svelte.ts` and `api.ts` fall back to localStorage for every flow. The same UI and code paths run, only the storage differs. Demo passwords are stored in plain localStorage: **demo only**.

## Security model (reviewed)

- **Money is server-only.** `subscriptions`, `ledger`, `creators`, `series` creation and `episodes` writes are denied to clients. Stripe webhooks are signature-verified and idempotent (`stripeEvents/{id}`). Out-of-order events are ignored via `lastEventAt`, and transfers carry idempotency keys.
- **No impersonation.** Handles are unique (`handles/{handle}`, claimed in the same batch as the profile). A comment's `handle` must equal the author's real handle, and `createdAt` must be server time.
- **Shape-checked client writes.** follows/likes/saved/hidden/reads are exactly `{at: request.time}`, and every string has a length cap.
- **Path injection.** Every client-supplied slug/episode id is regex-validated before use in a Firestore path.
- **Premium content.** Premium panel paths never appear in public docs. They're served as 15-minute signed URLs to active subscribers only.
- **Uploads.** Only accounts with the `creator` claim can upload (30 MB, png/jpeg/webp/avif only; no SVG). `sharp` has `limitInputPixels` against decompression bombs.
- **Double billing.** `createCheckout` asks Stripe for existing subscriptions, not just Firestore, and Checkout sessions expire after 30 minutes.
- **Refunds** reverse the same fraction of each creator transfer.
- **Open redirects.** `?next=` goes through `safeNext` (tested).
- **Demo mode can't ship by accident.** `npm run deploy` refuses to build without Firebase config unless `VITE_ALLOW_DEMO=true`.

### Bots, spam and comments

| Layer | What it stops |
|---|---|
| Email required + `screenSignup` blocking function | Accounts without email; throwaway inboxes |
| Sign-up honeypot + minimum fill time | Dumb form-filling bots |
| App Check (reCAPTCHA Enterprise) on callables | Scripts calling the API directly |
| Email verification | Commenting from unverified addresses |
| **Supporters-only comments** (`COMMENT_POLICY`) | Drive-by spam. Every commenter has a card on file |
| `postComment` callable: 5/min, 60/day | Floods |
| `spam.ts` filter → `held` | Links from new accounts, scam phrases, contact details, shouting, duplicates |
| Reports: 3 → auto-hide; `moderate` callable for mods + series creators | Anything that got through |

## Known pitfalls, still open

| Risk | Why it matters | Plan |
|---|---|---|
| Likes/follows aren't rate limited | A script with a real account could toggle likes to run up counter-function invocations | App Check enforcement on Firestore covers most of it; add a per-user limit if it shows up |
| Chargebacks | $15 fee each (TinyCoup pays it) | 30-day hold + freeze/void handles creator money; Stripe Radar rules to stop fraud up front |
| Sales tax / VAT / GST | Digital subscriptions are taxable in the EU, UK, Canada and many US states; TinyCoup is merchant of record | Stripe Tax, prices tax-inclusive or added at checkout |
| Cross-border payouts | Stripe Connect can only pay creators in other countries from a **US** platform account | Decide where the business is incorporated before inviting non-US creators |
| International card fees | +1.5% international card, +1% FX. On a $2.49 pick the platform goes negative | Accept it (not for profit) or set a small FX-aware minimum |
| Signed URLs need IAM | `getSignedUrl` needs the Functions service account to hold *Service Account Token Creator* | Grant it once in IAM |
| Moderation UI | `moderate` callable exists, but there's no mod-queue page yet | Build `/mod` listing held comments + open reports |
| `reads` grows forever | Firestore cost per user over years | Cap at ~500 and prune in a scheduled job |
| Rules untested | A rule typo can open a hole | Add `@firebase/rules-unit-testing` tests against the emulator in CI |

## Launch TODO

Search the code for `TODO(` for the full list. The big ones:

- [ ] **Legal**: Terms, Privacy, refunds, DMCA. Placeholder pages only.
- [ ] Series covers + avatar upload; co-creator management UI.
- [ ] Episode edit / unpublish / reorder panels; drafts; scheduled publishing.
- [ ] Build-time Firestore read so new series/episodes get prerendered HTML (+ rebuild trigger on publish).
- [ ] Settle `owed` ledger rows after Connect onboarding; creator statements + CSV; Stripe Express dashboard link.
- [ ] Annual plan price.
- [ ] Handle uniqueness (`handles/{handle}` doc), Google-sign-in handle picker.
- [ ] Comment replies, moderation/reporting, rate limits.
- [ ] View counting (sharded counters), creator analytics (backers count).
- [ ] Notifications (email on new episode, weekly digest, web push).
- [ ] Search beyond ~10k episodes (Typesense/Algolia extension).
- [ ] OG images for link previews (first panel 1600 WebP; branded fallback PNG).
- [ ] Service worker for the PWA (offline shell, cache recent panels).
- [ ] Dark theme; accessibility pass; alt text per panel.
- [ ] Stripe API upgrade path (`invoice.charge` → invoice payments on API ≥ 2025-03-31).
