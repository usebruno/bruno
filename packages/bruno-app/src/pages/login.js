import Head from 'next/head';
import Login from 'pageComponents/Login';
import MenuBar from 'components/Sidebar/MenuBar';
import GlobalStyle from '../globalStyles';

export default function LoginPage() {
  return (
    <div>
      <Head>
        <title>bruno</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <GlobalStyle />

      <main>
        <div className="flex flex-row h-full">
          <MenuBar />
          <div className="flex flex-grow h-full">
            <Login />
          </div>
        </div>
      </main>
    </div>
  );
}
