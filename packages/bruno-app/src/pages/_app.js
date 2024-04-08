import { useState, useEffect } from 'react';
import { Provider } from 'react-redux';
import { AppProvider } from 'providers/App';
import { ToastProvider } from 'providers/Toaster';
import { HotkeysProvider } from 'providers/Hotkeys';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createTheme, MantineProvider } from '@mantine/core';

import ReduxStore from 'providers/ReduxStore';
import ThemeProvider from 'providers/Theme/index';
import ErrorBoundary from './ErrorBoundary';

import '../styles/app.scss';
import '../styles/globals.css';
import 'codemirror/lib/codemirror.css';
import 'graphiql/graphiql.min.css';
import 'react-tooltip/dist/react-tooltip.css';
import '@usebruno/graphql-docs/dist/style.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@mantine/core/styles.css';

const queryClient = new QueryClient();

const theme = createTheme({
  focusRing: 'never',

  defaultRadius: 'xs'
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
      <MantineProvider theme={theme} defaultColorScheme={'dark'}>
        <SafeHydrate>
          <NoSsr>
            <QueryClientProvider client={queryClient}>
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
            </QueryClientProvider>
          </NoSsr>
        </SafeHydrate>
      </MantineProvider>
    </ErrorBoundary>
  );
}

export default MyApp;
