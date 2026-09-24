import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
export default {
  preprocess: vitePreprocess(),
  kit: {
    // Every known page is prerendered to real HTML (SEO + link previews).
    // Anything published after the last build falls through to 200.html,
    // which boots the app and loads the page from Firestore client-side.
    adapter: adapter({ pages: 'build', assets: 'build', fallback: '200.html', strict: false }),
    prerender: { handleHttpError: 'fail', handleMissingId: 'ignore' }
  }
};
