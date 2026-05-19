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
      return (
        <div className="flex text-center justify-center p-20 h-full">
          <div className="bg-white rounded-lg p-10 w-full">
            <div className="m-auto" style={{ width: '256px' }}>
              <Bruno width={256} />
            </div>

            <h1 className="text-2xl font-medium text-red-600 mb-2">Oops! Something went wrong</h1>
            <p className="text-red-500 mb-2">
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

            <button
              className="bg-red-500 text-white px-4 py-2 mt-4 rounded hover:bg-red-600 transition"
              onClick={() => this.returnToApp()}
            >
              Return to App
            </button>

            <div className="mt-5 pt-4 border-t border-gray-100 flex flex-col items-center gap-2">
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
                  if (this.state.clearCaches) {
                    return await this.clearCache();
                  }
                  this.forceQuit();
                }}
              >
                Force Quit
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
