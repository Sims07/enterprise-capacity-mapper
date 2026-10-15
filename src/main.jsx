import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';
import './linear-pro.css';

if ('serviceWorker' in navigator) {
  const registerServiceWorker = () => navigator.serviceWorker.register('./sw.js').catch(console.error);
  if (document.readyState === 'complete') registerServiceWorker();
  else window.addEventListener('load', registerServiceWorker, { once: true });
}
createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>);