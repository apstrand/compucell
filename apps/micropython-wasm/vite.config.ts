import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import path from 'path'

export default defineConfig({
  plugins: [svelte()],
  worker: {
    format: 'es',
  },
  resolve: {
    alias: {
      '@compucell/notebook-core': path.resolve(__dirname, '../../packages/notebook-core/src/index.ts')
    }
  },
  server: {
    fs: {
      allow: [
        path.resolve(__dirname, '../..'),
        path.resolve(__dirname, '../../../nokit-web/assets')
      ]
    }
  }
})
