import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

// This is a custom Vite plugin to forcefully add the required headers.
const customHeadersPlugin = {
	name: 'add-cors-headers',
	configureServer: (server: any) => {
		server.middlewares.use((_req: any, res: any, next: any) => {
			res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
			res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
			next();
		});
	}
};

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit(),
		// Add our custom plugin to the list.
		customHeadersPlugin
	]
});
