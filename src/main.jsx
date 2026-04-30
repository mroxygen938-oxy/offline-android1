import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import App from './App.jsx'
import { isNative } from './lib/native.js'

/* Apply the persisted theme before first paint so the login screen
   matches the rest of the app (otherwise it briefly flashes light). */
;(() => {
  try {
    const raw = window.localStorage.getItem('oxygen-vault-offline/theme')
    const theme = raw ? JSON.parse(raw) : 'dark'
    document.documentElement.setAttribute('data-theme', theme || 'dark')
  } catch {
    document.documentElement.setAttribute('data-theme', 'dark')
  }
})()

/* Tag the document on Capacitor builds so CSS can drop expensive
   effects (backdrop-filter, large box-shadows) that the Android
   WebView struggles to composite, especially over long lists. The
   visual cost is small; the frame-rate win is large. */
if (isNative()) {
  document.documentElement.classList.add('native')
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

