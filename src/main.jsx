// ── Console method guard ─────────────────────────────────────
// Plaid Link SDK and some third-party scripts call console.info/debug/warn
// before the browser fully initializes them in certain WebViews and iOS Safari.
// This ensures they're always functions so those SDKs don't throw.
;['log','info','warn','error','debug','group','groupEnd','groupCollapsed','time','timeEnd'].forEach(m => {
  if (typeof console[m] !== 'function') {
    // eslint-disable-next-line no-console
    console[m] = () => {}
  }
})

import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import './styles/global.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
)
