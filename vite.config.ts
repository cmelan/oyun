import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: './', /* relative: works from file://, Capacitor shells, any subpath */
  preview: {
    allowedHosts: ['oyun-xovq.onrender.com'],
  },
  test: {
    include: ['tests/**/*.test.ts'],
    exclude: ['archive/**', 'node_modules/**', 'dist/**'],
  },
});
