import CodeEditor from 'components/CodeEditor/index';
import HTTPSnippet from 'httpsnippet';
import { useTheme } from 'providers/Theme/index';
import { buildHarRequest } from 'utils/codegenerator/har';

const index = ({ language, item }) => {
  const { target, client, language: lang } = language;
  const snippet = new HTTPSnippet(buildHarRequest(item.request)).convert(target, client);
  const { storedTheme } = useTheme();
  return (
    <CodeEditor
      readOnly
      // value={JSON.stringify(item, null, 2)}
      value={snippet}
      theme={storedTheme}
      mode={lang}
    />
  );
};

export default index;
