import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Si el navegador tiene cacheado un index.html de un deploy viejo, puede
// intentar cargar un chunk de JS que ya no existe en el servidor (los
// nombres de archivo cambian en cada deploy) — sin esto, la carga se queda
// "pensando" para siempre. sessionStorage evita un loop de recargas si el
// problema persiste por otra razón.
window.addEventListener('vite:preloadError', () => {
  if (sessionStorage.getItem('reload-por-chunk-viejo')) return
  sessionStorage.setItem('reload-por-chunk-viejo', '1')
  window.location.reload()
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
