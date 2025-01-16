import { useState, useEffect } from 'react';
import { Provider } from 'react-redux';
import { AppProvider } from 'providers/App';
import { ToastProvider } from 'providers/Toaster';
import { HotkeysProvider } from 'providers/Hotkeys';

import ReduxStore from 'providers/ReduxStore';
import ThemeProvider from 'providers/Theme/index';
import ErrorBoundary from './ErrorBoundary';

import '../styles/globals.css';
import 'codemirror/lib/codemirror.css';
import 'graphiql/graphiql.min.css';
import 'react-tooltip/dist/react-tooltip.css';
import '@usebruno/graphql-docs/dist/esm/index.css';
import '@fontsource/inter/100.css';
import '@fontsource/inter/200.css';
import '@fontsource/inter/300.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/inter/800.css';
import '@fontsource/inter/900.css';
import { setupPolyfills } from 'utils/common/setupPolyfills';
setupPolyfills();

function Main({ children }) {
  if (!window.ipcRenderer) {
    return (
      <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 mx-10 my-10 rounded relative" role="alert">
        <strong class="font-bold">ERROR:</strong>
        <span className="block inline ml-1">"ipcRenderer" not found in window object.</span>
        <div>
          You most likely opened Bruno inside your web browser. Bruno only works within Electron, you can start Electron
          in an adjacent terminal using "npm run dev:electron".
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <Provider store={ReduxStore}>
        <ThemeProvider>
          <ToastProvider>
            <AppProvider>
              <HotkeysProvider>
                {children}
              </HotkeysProvider>
            </AppProvider>
          </ToastProvider>
        </ThemeProvider>
      </Provider>
    </ErrorBoundary>
  );
}

export default Main;


