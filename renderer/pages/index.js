import Head from 'next/head';
import IndexPage from 'pageComponents/Index';
import GlobalStyle from '../globalStyles';

export default function Home() {
  return (
    <div>
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
};
