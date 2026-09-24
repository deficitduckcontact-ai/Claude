# Put TinyCoup online (preview site with real accounts)

About 15 minutes, once. You need a Google account and your Mac's **Terminal**.
You do **not** need a domain name. You get a free address like
`https://comics-preview-1a2b3.web.app`, and you can attach your real domain later
without rebuilding anything.

**What works on the preview site:** real sign-up and log-in, email verification,
follows, likes, saves, reading history, dark mode, installing it as an app, and
"notify me" lists for subscriptions and creators.
**What says "coming soon":** subscriptions/payments, comments, creator uploads,
self-serve account deletion. Those need the paid backend (step 8, at launch).
The placeholder comics stay until real creators post. Search engines are kept
out until launch (`static/robots.txt`).

---

## 1. Create the Firebase project (2 min)
1. Go to **https://console.firebase.google.com** and sign in with Google.
2. Click **Create a project** (or **Add project**).
3. Name: anything neutral, e.g. `comics-preview`. Firebase shows the **Project ID**
   under the name (like `comics-preview-1a2b3`). **Write it down.**
   The ID can't be changed later, but nobody sees it once you add a real domain.
4. Google Analytics: switch it **off** (simpler; you can add it later).
5. Click **Create project**, then **Continue**.

## 2. Turn on log-in (1 min)
1. Left menu: **Build → Authentication → Get started**.
2. Click **Email/Password**, switch on the first toggle, **Save**.
3. Optional: **Add new provider → Google**, switch it on, choose your support email, **Save**.

## 3. Create the database (1 min)
1. Left menu: **Build → Firestore Database → Create database**.
2. Location: leave the default. It can't be changed later, and the default is fine.
3. Choose **Start in production mode** and click **Create**.
   (Don't worry about the rules it shows; step 5 installs TinyCoup's own.)

## 4. Get the code onto your Mac (first time only)
In Terminal:
```
git clone -b claude/jolly-meitner-5ftxf9 https://github.com/deficitduckcontact-ai/Claude.git ~/tinycoup
cd ~/tinycoup
npm install
```
(Already did this earlier? Just run `cd ~/tinycoup && git pull && npm install`.)

## 5. Connect and publish (3 min)
Still in Terminal, inside `~/tinycoup`:
```
npm run login
```
A browser tab opens. Pick the same Google account, then click **Allow**. Back in Terminal:
```
npx firebase use YOUR-PROJECT-ID
npm run deploy
```
(Replace `YOUR-PROJECT-ID` with the ID from step 1.)

When it finishes, it prints **Hosting URL: https://YOUR-PROJECT-ID.web.app**. That's your site.

## 6. Try it
1. Open the link. The top bar shows **PREVIEW** (not DEMO), which means it's connected.
2. **Sign up.** Check your inbox (and spam) for the verification email from
   `noreply@YOUR-PROJECT-ID.firebaseapp.com`, click the link, then click
   **"I've verified"** on the site.
3. Follow and like things, log out, log back in: it's all saved.
4. On your phone, open the link and install it: Share → **Add to Home Screen** (iPhone) or menu → **Install app** (Android).
5. See your users in Firebase: **Authentication → Users**. See the data: **Firestore Database**.

## 7. Updating the site later
```
cd ~/tinycoup
git pull
npm run deploy
```

## 8. Later: your real domain
Firebase console → **Hosting → Add custom domain**, type the domain you bought,
and follow the two DNS steps it shows. HTTPS is set up for you. Accounts and data
carry over untouched.

## 9. At launch: payments, comments, creators (we do this together)
This needs the **Blaze** plan (pay-as-you-go with a free allowance; set a budget
alert), plus Stripe keys. Then run `npm run deploy:backend`, switch the features
on in `src/lib/features.ts`, and run `npm run deploy`. The full checklist is in
the README ("Go live").

---

### If something goes wrong
| You see | Fix |
|---|---|
| `firebase: command not found` or `sh: firebase` | Run `npm install` inside `~/tinycoup` first |
| `Error: Failed to get Firebase project` | Check the ID spelling: `npx firebase projects:list` shows the right one |
| `Cloud Firestore API has not been used` / database not found | Do step 3, wait a minute, run `npm run deploy` again |
| Top bar says **DEMO** on your .web.app site | Hard-refresh (Cmd+Shift+R). If it persists, tell Claude |
| Sign-up says "operation-not-allowed" | Step 2 wasn't saved: switch on Email/Password |
| No verification email | Check spam; it comes from `noreply@…firebaseapp.com` |
