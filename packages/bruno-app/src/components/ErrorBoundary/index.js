import Bruno from "components/Bruno/index";
import store from "providers/ReduxStore/index";
import { useEffect } from "react";

const GlobalErrorBoundaryFallback = ({ error, resetErrorBoundary }) => {
  useEffect(()=>{
    console.error(error);
  }, [error]);

  const retry = () => {
    resetErrorBoundary();
  }

  const resetApp = () => {
    const { ipcRenderer } = window;
    store.dispatch({type: 'RESET_STATE'});
    resetErrorBoundary();
    ipcRenderer.invoke('renderer:ready');
  }

  const forceQuit = () => {
    const { ipcRenderer } = window;
    ipcRenderer.invoke('main:force-quit');
  }

  return (
    <div className="flex text-center justify-center p-20 h-full">
      <div className="bg-white rounded-lg p-10 w-full">
        <div className="m-auto" style={{ width: '256px' }}>
          <Bruno width={256} />
        </div>
        <h1 className="text-2xl font-semibold text-red-600 mb-2">Oops! Something went wrong</h1>
        <pre className="my-4">Check the dev console for the error!</pre>
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

        <div className="flex flex-row gap-2 w-full justify-center">
          <button
            className="bg-red-500 text-white px-4 py-2 mt-4 rounded hover:bg-red-600 transition"
            onClick={() => retry()}
          >
            Retry
          </button>

          <button
            className="bg-red-500 text-white px-4 py-2 mt-4 rounded hover:bg-red-600 transition"
            onClick={() => resetApp()}
          >
            Reset App
          </button>
          <button
            className="border border-red-500 text-red-500 px-4 py-2 mt-4 rounded hover:border-red-600 transition"
            onClick={() => forceQuit()}
          >
            Force Quit
          </button>

        </div>
      </div>
    </div>
  );
}

export default GlobalErrorBoundaryFallback;