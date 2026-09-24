# TinyCoup architecture

## Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | SvelteKit 2 + Svelte 5, `adapter-static` | Every series/episode is **prerendered to real HTML**, so pages are indexable and shared links get proper previews. No SSR server: nothing to scale or cold-start. |
| Hosting | Firebase Hosting | CDN edge; `200.html` fallback serves pages published after the last build (rendered client-side from Firestore). |
| Data | Firestore | Public reads straight from the client; anything touching money or counters is written only by Functions. |
| Images | Cloud Storage + `sharp` in Functions | Content-hashed, immutable, cache forever. |
| Money | Stripe Billing + Checkout + Customer Portal + Connect Express | One subscription per reader; per-invoice transfers to creators. |

The UI lineage is the "changing subscriptions" mockup (`changing-subscriptions.web.app`): tile picker, dot meter, sticky money footer, and cream/amber/mint accents. Brand colour is Facebook-style blue `#1877F2` on Facebook's `#F0F2F5` grey.

The desktop layout borrows from **old reddit**, not Tinyview:
- a "MY SERIES" strip across the top
- a light-blue header with tabs on its bottom edge
- a fluid list with a right sidebar and no left nav
- dense Verdana rows: rank, likes, 70px thumbnail, blue titles that turn purple once read, "submitted … by … to s/series"
- an expando button, and comments · share · save · hide · follow links
- threaded `[–]` comments, and "view more: next ›" paging

Series pages work like subreddits.

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
- Creators who haven't finished Connect onboarding accrue `state: 'owed'` ledger rows (TODO: settle job).

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

### Known pitfalls, still open

| Risk | Why it matters | Plan |
|---|---|---|
| No App Check / rate limits | Bots can spam sign-ups, comments, likes (and trigger counter functions) | Enable App Check (reCAPTCHA Enterprise) on Firestore/Functions; move comments to a callable with per-user limits |
| Chargebacks | $15 fee each, and creators were already paid | Handle `charge.dispute.closed` (lost) → reverse transfers; Stripe Radar rules |
| Sales tax / VAT / GST | Digital subscriptions are taxable in the EU, UK, Canada and many US states; TinyCoup is merchant of record | Stripe Tax, prices tax-inclusive or added at checkout |
| Cross-border payouts | Stripe Connect can only pay creators in other countries from a **US** platform account | Decide where the business is incorporated before inviting non-US creators |
| International card fees | +1.5% international card, +1% FX. On a $2.49 pick the platform goes negative | Accept it (not for profit) or set a small FX-aware minimum |
| Signed URLs need IAM | `getSignedUrl` needs the Functions service account to hold *Service Account Token Creator* | Grant it once in IAM |
| Moderation / DMCA / age | Anyone who onboards can publish immediately; users under 13 (COPPA) | Report button + review queue, registered DMCA agent, age gate at sign-up |
| Account deletion (GDPR/CCPA) | Required by law and by app stores | Callable: cancel Stripe sub, delete auth + user docs, anonymise comments |
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
