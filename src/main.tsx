import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './styles/index.css';

if ('serviceWorker' in navigator) {
  const registerServiceWorker = () => navigator.serviceWorker.register('./sw.js').catch(console.error);
  if (document.readyState === 'complete') registerServiceWorker();
  else window.addEventListener('load', registerServiceWorker, { once: true });
}

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element not found');

createRoot(rootElement).render(<React.StrictMode><App /></React.StrictMode>);
