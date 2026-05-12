import { Component, type ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  reset = () => {
    localStorage.removeItem('golfminsk-store')
    localStorage.removeItem('golf_jwt')
    window.location.reload()
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div
        style={{
          minHeight: '100dvh',
          background: '#111',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          gap: '20px',
          color: '#fff',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ fontSize: 40 }}>⚠️</div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>
            Something went wrong
          </div>
          <div
            style={{
              fontSize: 12,
              color: '#ff6b6b',
              background: '#2a1a1a',
              padding: '10px 14px',
              borderRadius: 8,
              maxWidth: 320,
              wordBreak: 'break-all',
              textAlign: 'left',
            }}
          >
            {this.state.error.message}
          </div>
        </div>
        <button
          onClick={this.reset}
          style={{
            background: '#22c55e',
            color: '#000',
            fontWeight: 700,
            fontSize: 15,
            padding: '12px 28px',
            borderRadius: 16,
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Reset and restart
        </button>
      </div>
    )
  }
}
