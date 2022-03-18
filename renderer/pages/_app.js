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

function MyApp({ Component, pageProps }) {
  return (
    <SafeHydrate>
      <AuthProvider>
        <Provider store={ReduxStore}>
          <AppProvider>
            <HotkeysProvider>
              <Component {...pageProps} />
            </HotkeysProvider>
          </AppProvider>
        </Provider>
      </AuthProvider>
    </SafeHydrate>
  );
}

export default MyApp
