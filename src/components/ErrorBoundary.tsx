import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

/**
 * Emergency fix (black-screen incident) — this app had zero error
 * boundaries anywhere, so any single uncaught render error, in any
 * component, silently unmounted the entire React tree. On a device
 * where CSS had already loaded (body's background is a plain CSS rule,
 * not JS-driven), that reads as a flat black or white screen with
 * nothing on it and no way to recover except clearing site data —
 * exactly the reported symptom, and why closing/reopening the installed
 * PWA didn't help: the crash reproduces from the user's own real data on
 * every load, it isn't a one-time cache-staleness fluke.
 *
 * Deliberately styled with plain inline styles, not this app's own
 * Tailwind classes/CSS variables — the one place reusing the app's own
 * theming system would be a bad bet, since a crash could in principle be
 * upstream of it. Shows the real error message + stack so a real crash
 * is finally diagnosable from a screenshot instead of guessed at, plus a
 * reload action so a user isn't stuck force-closing the app repeatedly.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    console.error('STOA crashed:', error, info.componentStack)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div
        style={{
          minHeight: '100vh',
          padding: 20,
          fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
          background: '#fafaf9',
          color: '#1c1917',
        }}
      >
        <h1 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Something went wrong</h1>
        <p style={{ fontSize: 14, color: '#78716c', marginTop: 8 }}>{error.message}</p>
        <pre
          style={{
            fontSize: 11,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            marginTop: 12,
            color: '#78716c',
            maxHeight: 320,
            overflow: 'auto',
            background: '#fff',
            border: '1px solid #e7e5e4',
            borderRadius: 8,
            padding: 10,
          }}
        >
          {error.stack}
        </pre>
        <button
          type="button"
          onClick={() => {
            this.setState({ error: null })
            window.location.href = '/'
          }}
          style={{
            marginTop: 16,
            padding: '10px 16px',
            borderRadius: 12,
            background: '#0d9488',
            color: '#fff',
            border: 'none',
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          Reload
        </button>
      </div>
    )
  }
}
