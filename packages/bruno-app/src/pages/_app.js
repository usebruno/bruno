import { HotkeysProvider } from "providers/Hotkeys";
import { AuthProvider } from "providers/Auth";
import { AppProvider } from "providers/App";
import ReduxStore from "providers/ReduxStore";
import { Provider } from "react-redux";
import { Toaster } from "react-hot-toast";

import "../styles/globals.scss";
import "tailwindcss/dist/tailwind.min.css";
import "react-tabs/style/react-tabs.css";
import "codemirror/lib/codemirror.css";
import "graphiql/graphiql.min.css";

import "../styles/app.scss";

function SafeHydrate({ children }) {
  return <div suppressHydrationWarning>{typeof window === "undefined" ? null : children}</div>;
}

function NoSsr({ children }) {
  const SERVER_RENDERED = typeof navigator === "undefined";

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
          <AppProvider>
            <HotkeysProvider>
              <Toaster toastOptions={{ duration: 2000 }} />
              <Component {...pageProps} />
            </HotkeysProvider>
          </AppProvider>
        </Provider>
      </NoSsr>
    </SafeHydrate>
  );
}

export default MyApp;
