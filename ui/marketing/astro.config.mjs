import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
  },
  site: process.env.SITE_URL ?? 'https://sharkly.co',
  publicDir: '../../public',
  output: 'server',
  adapter: vercel(),
  server: { port: 4321 },
  integrations: [
    sitemap(),
  ],
});
