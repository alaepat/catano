import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.tsx'

// Actualizaciones: al abrir la app (o volver a ella) se mira si hay una versión nueva publicada.
// Si la hay, se descarga y la página se recarga sola con ella, sin tener que cerrar la app.
registerSW({
  immediate: true,
  onRegisteredSW(_url, registration) {
    if (!registration) return
    const check = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) registration.update().catch(() => {})
    }
    document.addEventListener('visibilitychange', check)
    setInterval(check, 30 * 60 * 1000)
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
