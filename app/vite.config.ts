import { svelte } from '@sveltejs/vite-plugin-svelte'
import { svelteTesting } from '@testing-library/svelte/vite'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  base: './', // relative asset paths, so the build works under any GitHub Pages URL
  plugins: [svelte(), svelteTesting()],
  // The API's CORS list allows exactly http://127.0.0.1:8000, so the host and port are fixed.
  server: { host: '127.0.0.1', port: 8000, strictPort: true },
  preview: { host: '127.0.0.1', port: 8000, strictPort: true },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
  },
})
