import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import ErrorBoundary from './components/ErrorBoundary/ErrorBoundary'
import { PWA_NEED_REFRESH_EVENT, setPwaUpdater } from './lib/pwa'
import './styles/tokens.css'
import './styles/base.css'

// SW registration: UpdateBanner listens for the event and applies the update
// through lib/pwa.ts when the user taps "Reload".
const updateSW = registerSW({
  onNeedRefresh() {
    window.dispatchEvent(new CustomEvent(PWA_NEED_REFRESH_EVENT))
  },
  onOfflineReady() {},
})
setPwaUpdater(updateSW)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
