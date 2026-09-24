// Refuse to deploy a build that would run in DEMO MODE (fake accounts and
// fake checkout) to a real audience. Set VITE_ALLOW_DEMO=true for a preview site.
import { readFileSync, existsSync } from 'node:fs';

const env = { ...process.env };
for (const f of ['.env', '.env.production']) {
  if (!existsSync(f)) continue;
  for (const line of readFileSync(f, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !env[m[1]]) env[m[1]] = m[2];
  }
}
if (env.VITE_ALLOW_DEMO === 'true') process.exit(0);
const missing = ['VITE_FIREBASE_API_KEY', 'VITE_FIREBASE_PROJECT_ID', 'VITE_FIREBASE_APP_ID'].filter((k) => !env[k]);
if (missing.length) {
  console.error(`\n✖ Not deploying: ${missing.join(', ')} missing, so the site would run in DEMO MODE (fake payments).\n  Fill in .env, or set VITE_ALLOW_DEMO=true for a demo deployment.\n`);
  process.exit(1);
}
