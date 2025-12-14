
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/queryClient';

const renderApp = () => {
  const container = document.getElementById('root');
  
  if (container) {
    const root = createRoot(container);
    root.render(
      <React.StrictMode>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
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
