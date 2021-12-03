import { StoreProvider } from 'providers/Store';

import '../styles/globals.css'
import 'tailwindcss/dist/tailwind.min.css';

function MyApp({ Component, pageProps }) {
  return (
    <StoreProvider>
      <Component {...pageProps} />
    </StoreProvider>
  );
}

export default MyApp
