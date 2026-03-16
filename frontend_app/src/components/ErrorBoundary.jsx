import React from 'react';

/**
 * Error Boundary Component
 * Catches unhandled errors in child components and displays a graceful fallback UI
 * instead of crashing the entire application.
 * 
 * Usage:
 *   <ErrorBoundary>
 *     <YourComponent />
 *   </ErrorBoundary>
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-gray-800 rounded-lg shadow-xl p-8 text-center">
            <div className="text-5xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold mb-4">Something Went Wrong</h1>
            <p className="text-gray-300 mb-6">
              An unexpected error occurred. Please try refreshing the page to continue.
            </p>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4 p-3 bg-gray-700 rounded text-left text-sm text-gray-200 overflow-auto max-h-48">
                <summary className="cursor-pointer font-semibold mb-2">Error Details (Dev Only)</summary>
                <pre className="whitespace-pre-wrap break-words">
                  {this.state.error.toString()}
                  {'\n\n'}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
            <button
              onClick={() => window.location.href = '/'}
              className="mt-6 px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded font-semibold transition"
            >
              Return to Home
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
