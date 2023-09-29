import { useState, useEffect } from 'react';
import { Provider } from 'react-redux';
import { AppProvider } from 'providers/App';
import { ToastProvider } from 'providers/Toaster';
import { HotkeysProvider } from 'providers/Hotkeys';
import { PreferencesProvider } from 'providers/Preferences';

import ReduxStore from 'providers/ReduxStore';
import ThemeProvider from 'providers/Theme/index';
import ErrorBoundary from './ErrorBoundary';

import '../styles/app.scss';
import '../styles/globals.css';
import 'tailwindcss/dist/tailwind.min.css';
import 'codemirror/lib/codemirror.css';
import 'graphiql/graphiql.min.css';
import 'react-tooltip/dist/react-tooltip.css';

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

  return (
    <ErrorBoundary>
      <SafeHydrate>
        <NoSsr>
          <Provider store={ReduxStore}>
            <ThemeProvider>
              <ToastProvider>
                <AppProvider>
                  <PreferencesProvider>
                    <HotkeysProvider>
                      <Component {...pageProps} />
                    </HotkeysProvider>
                  </PreferencesProvider>
                </AppProvider>
              </ToastProvider>
            </ThemeProvider>
          </Provider>
        </NoSsr>
      </SafeHydrate>
    </ErrorBoundary>
  );
}

export default MyApp;
