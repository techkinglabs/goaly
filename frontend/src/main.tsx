import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import ErrorBoundary from './components/ui/ErrorBoundary';
import { ConfirmProvider } from './components/ui/ConfirmProvider';
import { ToastProvider } from './components/ui/ToastProvider';
import { createQueryClient } from './lib/queryClient';
import './index.css';

const queryClient = createQueryClient();

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element #root not found');

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <ErrorBoundary boundaryName="app-root">
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <ConfirmProvider>
            <App />
          </ConfirmProvider>
        </ToastProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
