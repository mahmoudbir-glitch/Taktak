import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import {smartessApiPlugin} from './server/vitePlugin.js';

export default defineConfig(({mode}) => {
  // Expose server-only secrets (SMARTESS_*) from .env to the dev API middleware.
  // They are read via process.env on the server and never bundled into the client.
  const env = loadEnv(mode, process.cwd(), 'SMARTESS_');
  for (const [key, value] of Object.entries(env)) {
    process.env[key] ??= value;
  }

  return {
    plugins: [react(), tailwindcss(), smartessApiPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
