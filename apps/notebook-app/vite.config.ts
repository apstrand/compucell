import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [svelte()],
  resolve: {
    alias: {
      '@coding-machine/notebook-core': path.resolve(__dirname, '../../packages/notebook-core/src/index.ts')
    }
  },
  server: {
    fs: {
      // Allow serving files from the monorepo root
      allow: ['..']
    }
  }
})
