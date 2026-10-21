import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles/base.css';
import './styles/compact-ui.css';
import './styles/dark-impact.css';
import './styles/navigation-highlight.css';
import './styles/navigation-rationalization.css';
import './styles/dark-contrast.css';
import './styles/description-fields.css';
import './styles/dashboard.css';
import './toolsMenuBehavior.js';

if ('serviceWorker' in navigator) {
  const registerServiceWorker = () => navigator.serviceWorker.register('./sw.js').catch(console.error);
  if (document.readyState === 'complete') registerServiceWorker();
  else window.addEventListener('load', registerServiceWorker, { once: true });
}
createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>);
