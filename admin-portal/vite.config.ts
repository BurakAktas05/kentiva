import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

function vendorChunk(id: string): string | undefined {
  if (!id.includes('node_modules')) return undefined
  if (id.includes('leaflet') || id.includes('react-leaflet')) return 'vendor-map'
  if (id.includes('recharts') || id.includes('d3-')) return 'vendor-charts'
  if (id.includes('framer-motion')) return 'vendor-motion'
  if (id.includes('react-dom') || id.includes('react-router') || id.includes('/react/')) return 'vendor-react'
  return 'vendor'
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  define: {
    global: 'globalThis',
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          return vendorChunk(id)
        },
      },
    },
  },
})
