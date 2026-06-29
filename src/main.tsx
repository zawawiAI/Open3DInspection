import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Apply saved theme before first paint to avoid flash
try {
  const saved =
    localStorage.getItem('open3dinspection:theme') ??
    localStorage.getItem('openinspection:theme') ??
    localStorage.getItem('openinspect:theme');
  if (saved === 'light' || saved === 'dark') {
    document.documentElement.dataset.theme = saved;
  }
} catch {
  /* ignore */
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
