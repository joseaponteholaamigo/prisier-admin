import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/prisier-admin/',
  plugins: [react()],
  server: {
    port: 5173,
  },
})
