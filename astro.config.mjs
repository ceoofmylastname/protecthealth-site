import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import rehypeSources from './scripts/rehype-sources.mjs';

// https://astro.build/config
export default defineConfig({
  site: 'https://www.protecthealth.com',
  trailingSlash: 'never',
  integrations: [
    sitemap({
      // Internal pages stay out of the sitemap. /app and /admin are noindexed
      // dashboards; listing a noindexed URL in the sitemap sends Google two
      // contradictory instructions about the same page.
      filter: (page) => !page.includes('/campaign-gallery') && !page.includes('/admin') && !page.includes('/app'),
      // Clean URLs in the XML sitemap, Cloudflare Pages serves /page from /page.html.
      serialize(item) {
        item.url = item.url.replace(/index\.html$/, '').replace(/\.html$/, '');
        return item;
      },
    }),
  ],
  build: {
    format: 'file',
  },
  markdown: {
    // Numbered inline citations + Sources section on every markdown body
    // (wiki: inline-citation-system). See scripts/rehype-sources.mjs.
    rehypePlugins: [rehypeSources],
  },
});
