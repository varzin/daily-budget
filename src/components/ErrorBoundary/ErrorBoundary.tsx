import { Component, type ReactNode } from 'react'
import styles from './ErrorBoundary.module.css'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

/**
 * Last-resort guard: an unexpected render error shows a recoverable screen
 * instead of a blank page. Data is untouched — it lives in localStorage (and
 * Dropbox when connected), so a reload is always safe.
 */
export default class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  override componentDidCatch(error: Error): void {
    console.error('Unhandled render error:', error)
  }

  override render(): ReactNode {
    if (!this.state.error) return this.props.children
    return (
      <div className={styles.wrap} role="alert">
        <h1 className={styles.title}>Something went wrong</h1>
        <p className={styles.body}>
          Your data is safe — it's stored in this browser (and in Dropbox if
          sync is connected). Reload the app to continue.
        </p>
        <button
          type="button"
          className={styles.btn}
          onClick={() => window.location.reload()}
        >
          Reload app
        </button>
      </div>
    )
  }
}
