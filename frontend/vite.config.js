import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Asegúrate de que NO haya una línea que diga base: o build: { outDir: ... }
})