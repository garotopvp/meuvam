import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

/** Rotas /professor/* (resumo, atletas…) → public/professor/index.html */
function professorSpaFallback() {
  return {
    name: 'professor-spa-fallback',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const path = (req.url || '').split('?')[0]
        if (!path.startsWith('/professor')) return next()

        const isStatic = /\.(js|mjs|css|png|jpe?g|gif|svg|ico|woff2?|json|html|map|txt)$/i.test(path)
        if (isStatic) return next()

        if (path === '/professor' || path === '/professor/') {
          req.url = '/professor/index.html'
          return next()
        }

        req.url = '/professor/index.html'
        next()
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    professorSpaFallback(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'Superação | Assessoria de Corrida',
        short_name: 'MeuVAM',
        description: 'Plataforma de treinos da Assessoria Superação',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'assets/logo.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'assets/logo.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // <== 365 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ],
  publicDir: 'public',
  server: {
    watch: {
      usePolling: true
    }
  }
})
