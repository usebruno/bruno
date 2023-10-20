import { useState, useEffect } from 'react';
import { Provider } from 'react-redux';
import { Inter } from 'next/font/google';
import { AppProvider } from 'providers/App';
import { ToastProvider } from 'providers/Toaster';
import { HotkeysProvider } from 'providers/Hotkeys';

import ReduxStore from 'providers/ReduxStore';
import ThemeProvider from 'providers/Theme/index';
import ErrorBoundary from './ErrorBoundary';

import '../styles/app.scss';
import '../styles/globals.css';
import 'tailwindcss/dist/tailwind.min.css';
import 'codemirror/lib/codemirror.css';
import 'graphiql/graphiql.min.css';
import 'react-tooltip/dist/react-tooltip.css';
import '@usebruno/graphql-docs/dist/esm/index.css';

const inter = Inter({
  display: 'swap',
  weight: ['400', '500', '600', '700'],
  subsets: ['cyrillic', 'cyrillic-ext', 'greek', 'greek-ext', 'latin', 'latin-ext', 'vietnamese']
});

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
      <main className={inter.className}>
        <SafeHydrate>
          <NoSsr>
            <Provider store={ReduxStore}>
              <ThemeProvider>
                <ToastProvider>
                  <AppProvider>
                    <HotkeysProvider>
                      <Component {...pageProps} />
                    </HotkeysProvider>
                  </AppProvider>
                </ToastProvider>
              </ThemeProvider>
            </Provider>
          </NoSsr>
        </SafeHydrate>
      </main>
    </ErrorBoundary>
  );
}

export default MyApp;
