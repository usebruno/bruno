import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);

    this.state = { hasError: false };
  }
  componentDidMount() {
    // Add a global error event listener to capture client-side errors
    window.onerror = (message, source, lineno, colno, error) => {
      this.setState({ hasError: true, error });
    };
  }
  componentDidCatch(error, errorInfo) {
    console.log({ error, errorInfo });
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center p-10">
          <div className="bg-white rounded-lg shadow-lg p-4 w-full">
            <h1 className="text-2xl font-semibold text-red-600 mb-2">Oops! Something went wrong</h1>
            <p className="text-red-600 mb-2">{this.state.error && this.state.error.toString()}</p>
            {this.state.error && this.state.error.stack && (
              <pre className="bg-gray-100 p-2 rounded-lg overflow-auto">{this.state.error.stack}</pre>
            )}
            <button
              className="bg-red-500 text-white px-4 py-2 mt-4 rounded hover:bg-red-600 transition"
              onClick={() => {
                this.setState({ hasError: false, error: null });
              }}
            >
              Close
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
