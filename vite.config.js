import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  /* `./` makes asset URLs relative to the HTML file, which is what we
     need for Electron (loads via file://) and what Capacitor's WebView
     uses too (https://localhost/ but resolves relative URLs correctly). */
  base: './',
})
