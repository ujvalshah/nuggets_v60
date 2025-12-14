
import React from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/queryClient';

// Log startup information
console.log('[App] Frontend starting...');
console.log('[App] Vite dev server: http://localhost:3000');
console.log('[App] Expected backend: http://127.0.0.1:5000');

// Perform lazy backend health check (non-blocking, with retry)
// This runs after a delay and doesn't block app startup
const checkBackendHealthLazy = async (retries = 3, delay = 2000) => {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch('/api/health', { 
        signal: AbortSignal.timeout(3000) // 3 second timeout
      });
      if (response.ok) {
        const data = await response.json();
        console.log('[App] ✅ Backend health check passed:', data);
        return;
      } else {
        console.warn('[App] ⚠️ Backend health check returned status:', response.status);
      }
    } catch (error: any) {
      if (i < retries - 1) {
        console.log(`[App] Backend not ready yet (attempt ${i + 1}/${retries}), retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        console.warn('[App] ⚠️ Backend health check failed after retries:', error.message);
        console.warn('[App] Backend may be starting up. App will continue in mock mode if VITE_ADAPTER_TYPE=local');
      }
    }
  }
};

// Run health check after a delay (non-blocking)
// Don't block app startup - let it render and check backend lazily
setTimeout(() => checkBackendHealthLazy(), 1000);

// Global error handlers for unhandled promise rejections
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    console.error('[Global Error Handler] Unhandled error:', event.error);
  });

  window.addEventListener('unhandledrejection', (event) => {
    console.error('[Global Error Handler] Unhandled promise rejection:', event.reason);
    // Prevent default browser error logging for network errors
    if (event.reason?.message?.includes('fetch') || event.reason?.message?.includes('ECONNREFUSED')) {
      event.preventDefault();
    }
  });
}

const renderApp = () => {
  const container = document.getElementById('root');
  
  if (container) {
    const root = createRoot(container);
    root.render(
      <React.StrictMode>
        <HashRouter>
          <QueryClientProvider client={queryClient}>
            <App />
          </QueryClientProvider>
        </HashRouter>
      </React.StrictMode>
    );
  } else {
    console.error("Failed to find the root element. Application cannot mount.");
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', renderApp);
} else {
  renderApp();
}
