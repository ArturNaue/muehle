// v1.0.0 | 2026-05-31 MEZ

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// PWA Auto-Update
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.ready.then(registration => {
    registration.addEventListener('updatefound', () => {
      if (!navigator.onLine) return;
      window.dispatchEvent(new CustomEvent('sw-update-start'));
    });
  });

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (navigator.onLine) window.location.reload();
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
