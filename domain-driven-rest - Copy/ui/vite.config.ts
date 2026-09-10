import { fileURLToPath } from "node:url"
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Assets are emitted with a RELATIVE base and the served shell carries an injected
// <base href="/<RoutePrefix>/">, so the same build works at any mount point. Nothing here
// may hardcode the route prefix — see src/shared/_critical/appMount.ts.
export default defineConfig({
  plugins: [react()],
  // Monaco vendors its sanitizer; route that import to the patched dependency too.
  resolve: { alias: [{ find: /^\.\/dompurify\/dompurify\.js$/, replacement: fileURLToPath(new URL('./node_modules/dompurify/dist/purify.es.mjs', import.meta.url)) }] },
  base: './',
  build: {
    outDir: 'dist',
  },
})
