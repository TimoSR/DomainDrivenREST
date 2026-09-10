import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// The build output is embedded into the DomainDrivenRest.AspNetCore package and served at
// the app's configured RoutePrefix (default "/request-builder"). Base is fixed to that
// default for v1; a non-default RoutePrefix should keep the default route ("/request-builder")
// available too, or this base can be made configurable via an env var in a later iteration.
export default defineConfig({
  plugins: [react()],
  base: '/request-builder/',
  build: {
    outDir: 'dist',
  },
})
