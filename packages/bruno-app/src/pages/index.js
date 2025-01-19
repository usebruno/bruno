import Bruno from './Bruno';
import GlobalStyle from '../globalStyles';
import '../i18n';
import Main from './Main';

export default function App() {
  return (
    <div>
      <main>
        <Main>
          <GlobalStyle />
          <Bruno />
        </Main>
      </main>
    </div>
  );
}
