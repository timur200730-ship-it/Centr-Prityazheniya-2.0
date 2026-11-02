import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [],
      manifest: {
        name: 'Центр Притяжения',
        short_name: 'Притяжение',
        description: 'Пространство встреч, поддержки и развития',
        theme_color: '#f7f4ef',
        background_color: '#f7f4ef',
        display: 'standalone',
        lang: 'ru',
        start_url: '/',
        icons: []
      }
    })
  ]
})