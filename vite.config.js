import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// تنظیمات ویت — با `npm run dev` سرور لوکال بالا میاد (host: true برای تست با موبایل در شبکه WiFi)
export default defineConfig({
  // base نسبی تا روی هر هاستی (حتی زیرپوشه) درست کار کنه
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'جدول امتیاز حکم',
        short_name: 'حکم',
        description: 'تابلوی امتیازات زنده بازی حکم برای جمع‌های خانوادگی',
        dir: 'rtl',
        lang: 'fa',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#0f766e',
        background_color: '#f0fdfa',
        start_url: '.',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // همه فایل‌های استاتیک (شامل فونت) کش میشن تا اپ سریع باز بشه
        globPatterns: ['**/*.{js,css,html,svg,png,woff,woff2}'],
        navigateFallback: 'index.html',
      },
    }),
  ],
  server: { host: true, port: 5173 },
})
