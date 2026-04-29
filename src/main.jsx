import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

let hiddenAt = null;

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    hiddenAt = Date.now();
  } else if (document.visibilityState === 'visible') {
    if (hiddenAt && Date.now() - hiddenAt > 30000) {
      window.location.reload();
    }
    hiddenAt = null;
  }
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
