import { Provider } from 'react-redux';
import { AppProvider } from 'providers/App';
import { ToastProvider } from 'providers/Toaster';
import { HotkeysProvider } from 'providers/Hotkeys';

import ReduxStore from 'providers/ReduxStore';
import ThemeProvider from 'providers/Theme/index';

import '../styles/app.scss';
import '../styles/globals.css';
import 'tailwindcss/dist/tailwind.min.css';
import 'react-tabs/style/react-tabs.css';
import 'codemirror/lib/codemirror.css';
import 'graphiql/graphiql.min.css';

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
  return (
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
  );
}

export default MyApp;
