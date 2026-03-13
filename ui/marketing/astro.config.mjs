import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env from monorepo root so MARKETING_URL and FRONTEND_URL work in local dev
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../..');

export default defineConfig({
	vite: {
		plugins: [tailwindcss()],
		envDir: rootDir
	},
	site: process.env.MARKETING_URL ?? 'https://sharkly.co',
	publicDir: '../../public',
	output: 'server',
	adapter: vercel(),
	server: { port: 4321 },
	integrations: [sitemap()]
});
