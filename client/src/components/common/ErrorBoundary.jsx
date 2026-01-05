import { Component } from 'react';
import './ErrorBoundary.css';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error caught by boundary:', error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-boundary-content">
            <div className="error-boundary-icon">
              <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                <circle cx="32" cy="32" r="26" stroke="currentColor" strokeWidth="3" fill="none"/>
                <path d="M32 20v16" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                <circle cx="32" cy="44" r="2.5" fill="currentColor"/>
              </svg>
            </div>
            <h1 className="error-boundary-title">문제가 발생했습니다</h1>
            <p className="error-boundary-message">페이지를 불러오는 중 오류가 발생했습니다.</p>
            <button onClick={this.handleReset} className="error-boundary-button">
              홈으로 돌아가기
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
