import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("UI Crash:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          height: '100vh', 
          width: '100vw', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          background: '#050B18', 
          color: 'white',
          fontFamily: 'sans-serif',
          textAlign: 'center',
          padding: '20px'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>⚠️</div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '10px' }}>Something went wrong.</h1>
          <p style={{ color: '#94a3b8', marginBottom: '30px', maxWidth: '400px' }}>
            The UI encountered an unexpected error. Don't worry, your data is safe.
          </p>
          <button 
            onClick={() => window.location.reload()} 
            style={{
              padding: '12px 24px',
              background: '#3b82f6',
              border: 'none',
              borderRadius: '12px',
              color: 'white',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            Reload Interface
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
