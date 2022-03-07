import { StoreProvider } from 'providers/Store';
import { HotkeysProvider } from 'providers/Hotkeys';

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
      <HotkeysProvider>
        <StoreProvider>
          <Component {...pageProps} />
        </StoreProvider>
      </HotkeysProvider>
    </SafeHydrate>
  );
}

export default MyApp
