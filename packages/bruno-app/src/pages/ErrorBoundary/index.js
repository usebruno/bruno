import React from 'react';

import Bruno from 'components/Bruno/index';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);

    this.state = { hasError: false, clearCaches: false };
  }

  componentDidMount() {
    // Add a global error event listener to capture client-side errors
    window.onerror = (message, source, lineno, colno, error) => {
      this.setState({ hasError: true, error });
    };
  }

  componentDidCatch(error, errorInfo) {
    console.log({ error, errorInfo });
    this.setState({ hasError: true, error, errorInfo });
  }

  async clearCache() {
    await window.ipcRenderer.invoke('main:cache-clear');
  }

  returnToApp() {
    const { ipcRenderer } = window;
    ipcRenderer.invoke('open-file');

    this.setState({ hasError: false, error: null, errorInfo: null });
  }

  forceQuit() {
    const { ipcRenderer } = window;
    ipcRenderer.invoke('main:force-quit');
  }

  render() {
    if (this.state.hasError) {
      const { error, errorInfo } = this.state;
      const stackTrace = error?.stack || errorInfo?.componentStack || 'No stack trace available';

      return (
        <div className="flex p-10 h-full min-h-screen gap-6">
          <div className="flex-1 bg-white rounded-lg p-10 text-center flex-shrink-0">
            <div className="m-auto" style={{ width: '120px' }}>
              <Bruno width={120} />
            </div>

            <h1 className="text-2xl font-medium text-red-600 mb-2">Oops! Something went wrong</h1>
            <p className="mb-2">
              If you are using an official production build: the above error is most likely a bug!
              <br />
              Please report this under:
              <a
                className="text-link hover:underline cursor-pointer ml-2"
                href="https://github.com/usebruno/bruno/issues"
                target="_blank"
              >
                https://github.com/usebruno/bruno/issues
              </a>
            </p>

            <div className="inline-flex flex-col items-center mt-4">
              <button
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition"
                onClick={() => this.returnToApp()}
              >
                Return to App
              </button>

              <div className="flex items-center my-3 w-full">
                <div className="flex-1 border-t border-gray-300"></div>
                <span className="px-3 text-gray-500 text-sm">or</span>
                <div className="flex-1 border-t border-gray-300"></div>
              </div>

              <div className="mt-1 pt-1 flex flex-col items-center gap-2">
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none hover:text-gray-800 transition">
                  <input
                    type="checkbox"
                    checked={this.state.clearCaches}
                    onChange={(e) => this.setState({ clearCaches: e.target.checked })}
                    className="cursor-pointer"
                  />
                  Clear caches on quit
                </label>
                <a
                  href=""
                  className="text-sm text-red-400 border border-red-400 hover:text-red-600 px-4 py-2 rounded transition cursor-pointer"
                  onClick={async (e) => {
                    e.preventDefault();
                    try {
                      if (this.state.clearCaches) {
                        await this.clearCache();
                      }
                    } finally {
                      this.forceQuit();
                    }
                  }}
                >
                  Force Quit
                </a>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 flex-shrink-0 flex-1 overflow-auto">
            <h2 className="text-lg font-medium text-red-600 mb-3">Stack Trace</h2>
            {error?.message && (
              <p className="text-red-500 font-medium mb-2">{error.message}</p>
            )}
            <pre className="text-left text-sm text-gray-700 whitespace-pre-wrap break-words font-mono bg-gray-100 p-4 rounded overflow-auto max-h-full">
              {stackTrace}
            </pre>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
