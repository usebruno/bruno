import { StoreProvider } from 'providers/Store';

import '../styles/globals.css'
import 'tailwindcss/dist/tailwind.min.css';
import 'react-tabs/style/react-tabs.css';
import 'codemirror/lib/codemirror.css';
import 'graphiql/graphiql.min.css';

function MyApp({ Component, pageProps }) {
  return (
    <StoreProvider>
      <Component {...pageProps} />
    </StoreProvider>
  );
}

export default MyApp
