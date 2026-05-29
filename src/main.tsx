import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import './styles/tokens.css'
import './styles/base.css'

// SW registration: expose update callback via custom event so UpdateBanner component can react
const updateSW = registerSW({
  onNeedRefresh() {
    window.dispatchEvent(new CustomEvent('pwa:need-refresh'))
  },
  onOfflineReady() {}
})
;(window as any).__pwaUpdateSW = updateSW  // UpdateBanner reads this to reload
createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)
