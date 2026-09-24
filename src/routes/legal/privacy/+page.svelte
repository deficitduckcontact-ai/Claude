<script lang="ts">import LegalPage from '$lib/components/LegalPage.svelte';</script>
<LegalPage title="Privacy Policy">
  <p>We collect as little as we can to run the site, never sell your data, and don't run third-party ad trackers.</p>
  <h2>What we collect</h2>
  <ul>
    <li><b>Account:</b> email, handle, password (stored hashed by Google Firebase), or your Google sign-in.</li>
    <li><b>Activity:</b> follows, likes, saves, read history, comments and reports.</li>
    <li><b>Payments:</b> handled by Stripe. We never see or store your full card number. We keep your Stripe customer ID, your picks and billing history.</li>
    <li><b>Creators:</b> identity and banking details go to Stripe Connect, not to us.</li>
    <li><b>Technical:</b> bot protection (Google reCAPTCHA / Firebase App Check) processes device signals to tell people from scripts.</li>
  </ul>
  <h2>Who processes it</h2>
  <p>Google Firebase (hosting, login, database, storage, US data centres) and Stripe (payments). Both act on our instructions under data-processing agreements.</p>
  <h2>Your rights</h2>
  <ul>
    <li>Access, correct, export, or delete your data. <b>Delete account</b> is in Settings; for anything else, email <b>[privacy email]</b>.</li>
    <li>Canada: PIPEDA and Quebec's Law 25. EU/UK: GDPR. California: CCPA. We honour these rights for everyone.</li>
    <li>Marketing email is opt-in only (Canada's CASL). Account and receipt emails aren't optional while you have an account.</li>
  </ul>
  <h2>Retention</h2>
  <p>Account data is deleted when you delete your account. Payment and payout records are kept for 7 years for tax law. Server logs are kept for 30 days.</p>
  <h2>Children</h2>
  <p>TinyCoup isn't for children under 13. If we learn we have an account for someone under 13, we delete it.</p>
  <h2>Cookies & storage</h2>
  <p>We use your browser's local storage for your login session and preferences (such as night mode). No advertising cookies.</p>
  <h2>Contact / privacy officer</h2>
  <p><b>[name, privacy email, mailing address]</b></p>
</LegalPage>
