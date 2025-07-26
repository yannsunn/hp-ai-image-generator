import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'fix-src-imports',
      enforce: 'pre',
      transform(code, id) {
        if (id.endsWith('.html')) {
          return code.replace('src="/src/main.jsx"', 'src="./src/main.jsx"')
        }
      }
    }
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
})