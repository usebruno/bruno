import { HotkeysProvider } from 'providers/Hotkeys';
import { AuthProvider } from 'providers/Auth';
import { AppProvider } from 'providers/App';
import ReduxStore from 'providers/ReduxStore';
import { Provider } from 'react-redux';

import '../styles/globals.css'
import 'tailwindcss/dist/tailwind.min.css';
import 'react-tabs/style/react-tabs.css';
import 'codemirror/lib/codemirror.css';
import 'graphiql/graphiql.min.css';

import '../styles/app.scss';

function SafeHydrate({ children }) {
  return (
    <div suppressHydrationWarning>
      {typeof window === 'undefined' ? null : children}
    </div>
  )
}

function NoSsr({ children }) {
  const SERVER_RENDERED = typeof navigator === 'undefined';

  if(SERVER_RENDERED) {
    return null;
  }

  return (
    <>
      {children}
    </>
  )
}

function MyApp({ Component, pageProps }) {
  return (
    <SafeHydrate>
      <NoSsr>
        <AuthProvider>
          <Provider store={ReduxStore}>
            <AppProvider>
              <HotkeysProvider>
                <Component {...pageProps} />
              </HotkeysProvider>
            </AppProvider>
          </Provider>
        </AuthProvider>
      </NoSsr>
    </SafeHydrate>
  );
}

export default MyApp
