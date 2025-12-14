
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:5000', // Use 127.0.0.1 instead of localhost to avoid IPv6 issues
          changeOrigin: true,
          secure: false,
          ws: false, // Disable websocket proxying
          timeout: 10000, // 10 second timeout
          configure: (proxy, _options) => {
            proxy.on('error', (err, req, res) => {
              console.warn('[Vite Proxy] Proxy error for', req.url, ':', err.message);
              // Don't crash - return a graceful error response
              if (res && !res.headersSent) {
                res.writeHead(503, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                  error: 'Backend server unavailable',
                  message: 'The backend server is not running or not accessible. Please start it with: npm run dev:server'
                }));
              }
            });
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              // Only log in development to reduce noise
              if (process.env.NODE_ENV === 'development') {
                console.log('[Vite Proxy]', req.method, req.url, '→ http://127.0.0.1:5000' + req.url);
              }
            });
            proxy.on('proxyRes', (proxyRes, req, _res) => {
              // Log errors from backend
              if (proxyRes.statusCode && proxyRes.statusCode >= 500) {
                console.warn('[Vite Proxy] Backend returned error', proxyRes.statusCode, 'for', req.url);
              }
            });
          },
        },
      },
    },
    plugins: [react()],
    define: {
      // SECURITY UPDATE: Removed API_KEY injection. 
      // The frontend should NOT have access to secrets.
      'process.env.REACT_APP_VERSION': JSON.stringify(process.env.npm_package_version),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
  };
});
