import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.POKE_API_KEY': JSON.stringify(env.POKE_API_KEY),
      'process.env.POKE_API_BASE_URL': JSON.stringify(env.POKE_API_BASE_URL),
      'process.env.POKE_MODEL': JSON.stringify(env.POKE_MODEL),
      'process.env.NEWS_API_KEY': JSON.stringify(env.NEWS_API_KEY),
      'process.env.NEWS_API_BASE_URL': JSON.stringify(env.NEWS_API_BASE_URL),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
