import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/fintrack-ie/',
  build: {
    outDir: 'dist',
    minify: false,
    rollupOptions: {
      output: {
        manualChunks: undefined,
      }
    }
  }
})
