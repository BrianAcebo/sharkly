import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import tailwindcss from '@tailwindcss/vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = resolve(__dirname, '../..');

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
	const rootEnv = loadEnv(mode, repoRoot, '');
	const sentryAuthToken = rootEnv.SENTRY_AUTH_TOKEN;
	const sentryPlugin =
		sentryAuthToken != null && sentryAuthToken !== ''
			? sentryVitePlugin({
					org: rootEnv.SENTRY_ORG ?? 'sharkly',
					project: rootEnv.SENTRY_PROJECT ?? 'javascript-react',
					authToken: sentryAuthToken,
					sourcemaps: {
						assets: './dist/**',
						filesToDeleteAfterUpload: './dist/**/*.map',
					},
				})
			: null;

	return {
		base: '/',
		envDir: repoRoot,
		plugins: [react(), tailwindcss(), ...(sentryPlugin ? [sentryPlugin] : [])],
		optimizeDeps: {
			exclude: ['lucide-react'],
		},
		resolve: {
			alias: {
				'@': resolve(__dirname, './src'),
			},
		},
		server: {
			port: 5173,
			strictPort: true,
			proxy: {
				'/api': {
					target: 'http://localhost:3000',
					changeOrigin: true,
				},
			},
		},
		preview: {
			proxy: {
				'/api': {
					target: 'http://localhost:3000',
					changeOrigin: true,
				},
			},
		},
		build: {
			// Only emit maps when uploading to Sentry (hidden = no //# sourceMappingURL in bundles)
			sourcemap: sentryAuthToken ? 'hidden' : false,
		},
	};
});
