import { SERIES } from '$lib/seed';
// Prerender every known series. New series (after the last build) are served
// by the 200.html fallback and rendered client-side.
// TODO(live): read slugs from Firestore at build time so new series get static HTML on the next deploy.
export const entries = () => SERIES.map((s) => ({ slug: s.slug }));
