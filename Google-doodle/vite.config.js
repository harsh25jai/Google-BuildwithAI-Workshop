import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  base: '/Google-BuildwithAI-Workshop/',
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        cricket: resolve(__dirname, 'challenges/cricket/index.html'),
        ghost: resolve(__dirname, 'challenges/ghost/index.html'),
        hurdles: resolve(__dirname, 'challenges/hurdles/index.html'),
        emergent: resolve(__dirname, 'challenges/emergent-text/index.html'),
      },
    },
  },
});
