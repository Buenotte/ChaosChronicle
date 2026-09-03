import React from 'react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '1.5rem',
          background: '#18181b',
          border: '1px solid #ef4444',
          borderRadius: '10px',
          color: '#fca5a5',
          margin: '1rem',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          <div style={{ fontSize: '1.5rem' }}>⚠️</div>
          <h3 style={{ margin: 0, color: '#f87171', fontSize: '1rem' }}>
            Произошла ошибка при отображении компонента
          </h3>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#9ca3af', maxWidth: '400px' }}>
            {this.state.error?.message || 'Непредвиденный сбой интерфейса'}
          </p>
          <button
            type="button"
            onClick={this.handleReset}
            style={{
              background: '#ef4444',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              padding: '0.45rem 1rem',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            🔄 Попробовать снова
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
