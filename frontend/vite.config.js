import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// From env
const port = parseInt(process.env.VITE_PORT || '5173', 10)
const apiTarget = process.env.VITE_API_BASE_URL || 'http://localhost:5000'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: port,
    strictPort: true,
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: true,
        secure: false,
        ws: true,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.error('Proxy error:', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Proxying request:', req.method, req.url);
            console.log('Sending Request to the Target:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
          });
        }
      }
    },
    hmr: {
      clientPort: port,
      overlay: false
    }
  },
  preview: {
    port: port,
    strictPort: true,
  }
})