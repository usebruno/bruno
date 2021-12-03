import Head from 'next/head';
import Navbar from '@grafnode/components';

export default function Home() {
  return (
    <div>
      <Head>
        <title>grafnode</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main>
        <Navbar />
      </main>
    </div>
  )
}
