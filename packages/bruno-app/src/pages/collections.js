import Head from "next/head";
import Collections from "pageComponents/Collections";
import MenuBar from "components/Sidebar/MenuBar";
import GlobalStyle from "../globalStyles";

export default function CollectionsPage() {
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
          <div className="flex flex-grow h-full px-8">
            <Collections />
          </div>
        </div>
      </main>
    </div>
  );
}
