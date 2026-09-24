import { CREATORS } from '$lib/seed';
export const entries = () => CREATORS.map((c) => ({ handle: c.handle }));
