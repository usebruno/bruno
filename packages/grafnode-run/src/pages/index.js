import Head from 'next/head';
import Main from 'pageComponents/Main';
import GlobalStyle from '../globalStyles';

export default function Home() {
  return (
    <div>
      <Head>
        <title>grafnode</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <GlobalStyle />

      <main>
        <Main />
      </main>
    </div>
  )
}
