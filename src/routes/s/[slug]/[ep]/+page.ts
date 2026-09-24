import { EPISODES } from '$lib/seed';
export const entries = () => EPISODES.map((e) => ({ slug: e.slug, ep: e.id }));
