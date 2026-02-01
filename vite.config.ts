import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { cpSync, existsSync } from 'fs'

// Plugin to copy marketing site to dist
const copyMarketingSite = () => ({
  name: 'copy-marketing-site',
  closeBundle() {
    const src = resolve(__dirname, 'site')
    const dest = resolve(__dirname, 'dist/site')
    if (existsSync(src)) {
      cpSync(src, dest, { recursive: true })
      console.log('✓ Marketing site copied to dist/site')
    }
  }
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), copyMarketingSite()],
})
