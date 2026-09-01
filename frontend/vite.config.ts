import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        // Split heavy vendor libraries into separate cacheable chunks.
        // Rollup 4 requires the function form of manualChunks.
        manualChunks(id) {
          if (id.includes('@mysten/sui') || id.includes('@mysten/dapp-kit')) {
            return 'vendor-sui';
          }
          if (id.includes('recharts') || id.includes('d3-')) {
            return 'vendor-charts';
          }
          if (id.includes('react-router-dom')) {
            return 'vendor-router';
          }
          if (id.includes('@tanstack/react-query')) {
            return 'vendor-query';
          }
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
            return 'vendor-react';
          }
        },
      },
    },
  },
})
