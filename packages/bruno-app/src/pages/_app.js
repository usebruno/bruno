import { useState, useEffect } from 'react';
import { Provider } from 'react-redux';
import { AppProvider } from 'providers/App';
import { ToastProvider } from 'providers/Toaster';
import { HotkeysProvider } from 'providers/Hotkeys';

import ReduxStore from 'providers/ReduxStore';
import ThemeProvider from 'providers/Theme/index';
import ErrorBoundary from './ErrorBoundary';

import '../styles/app.scss';
import '../styles/globals.css';
import 'codemirror/lib/codemirror.css';
import 'graphiql/graphiql.min.css';
import 'react-tooltip/dist/react-tooltip.css';
import '@usebruno/graphql-docs/dist/esm/index.css';
import { DictionaryProvider } from 'providers/Dictionary/index';

function SafeHydrate({ children }) {
  return <div suppressHydrationWarning>{typeof window === 'undefined' ? null : children}</div>;
}

function NoSsr({ children }) {
  const SERVER_RENDERED = typeof navigator === 'undefined';

  if (SERVER_RENDERED) {
    return null;
  }

  return <>{children}</>;
}

function MyApp({ Component, pageProps }) {
  const [domLoaded, setDomLoaded] = useState(false);

  useEffect(() => {
    setDomLoaded(true);
  }, []);

  if (!domLoaded) {
    return null;
  }

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
      <SafeHydrate>
        <NoSsr>
          <Provider store={ReduxStore}>
            <ThemeProvider>
              <DictionaryProvider>
                <ToastProvider>
                  <AppProvider>
                    <HotkeysProvider>
                      <Component {...pageProps} />
                    </HotkeysProvider>
                  </AppProvider>
                </ToastProvider>
              </DictionaryProvider>
            </ThemeProvider>
          </Provider>
        </NoSsr>
      </SafeHydrate>
    </ErrorBoundary>
  );
}

export default MyApp;
