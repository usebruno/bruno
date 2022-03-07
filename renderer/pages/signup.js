import Head from 'next/head';
import SignUp from 'pageComponents/SignUp';
import MenuBar from 'components/Sidebar/MenuBar';
import GlobalStyle from '../globalStyles';

export default function SignUpPage() {
  return (
    <div>
      <Head>
        <title>grafnode</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <GlobalStyle />

      <main>
        <div className="flex flex-row h-full">
          <MenuBar />
          <div className="flex flex-grow h-full">
            <SignUp />
          </div>
        </div>
      </main>
    </div>
  );
};
