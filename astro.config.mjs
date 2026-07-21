import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://www.protecthealth.com',
  trailingSlash: 'never',
  integrations: [
    sitemap({
      // Clean URLs in the XML sitemap — Cloudflare Pages serves /page from /page.html.
      serialize(item) {
        item.url = item.url.replace(/index\.html$/, '').replace(/\.html$/, '');
        return item;
      },
    }),
  ],
  build: {
    format: 'file',
  },
});
