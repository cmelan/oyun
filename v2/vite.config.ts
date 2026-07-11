import { defineConfig } from 'vite';

export default defineConfig({
  base: './', /* relative: works from file://, Capacitor shells, any subpath */
  build: { chunkSizeWarningLimit: 1600 /* Phaser is one big chunk; fine offline */ },
});
