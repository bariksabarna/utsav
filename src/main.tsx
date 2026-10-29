/**
 * Client entry point.
 *
 * Responsibilities: mount the React app and register the offline shell in
 * production without blocking the first render.
 * FR IDs: FR-PWA-001, FR-PWA-002.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles.css';
import { App } from './App';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js').catch(() => undefined);
  });
}
