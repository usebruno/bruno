import Head from 'next/head';
import Main from 'pageComponents/Main';

export default function Home() {
  return (
    <div>
      <Head>
        <title>grafnode</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main>
        <Main />
      </main>
    </div>
  )
}
