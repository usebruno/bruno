import Head from "next/head";
import IndexPage from "pageComponents/Index";
import GlobalStyle from "../globalStyles";

import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import useLocalStorage from "src/hooks/useLocalStorage";
import { updateTheme } from "providers/ReduxStore/slices/app";

export default function Home() {
  const dispatch = useDispatch();
  const [storedTheme, _] = useLocalStorage("bruno.theme", "light");
  const { theme } = useSelector((state) => state.app);

  useEffect(() => {
    dispatch(updateTheme({ theme: storedTheme }));
  }, [storedTheme]);

  return (
    <div className={theme}>
      <Head>
        <title>bruno</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <GlobalStyle />

      <main>
        <IndexPage />
      </main>
    </div>
  );
}
