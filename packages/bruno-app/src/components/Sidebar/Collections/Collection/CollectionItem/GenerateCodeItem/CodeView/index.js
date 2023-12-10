import CodeEditor from 'components/CodeEditor/index';
import get from 'lodash/get';
import { HTTPSnippet } from 'httpsnippet';
import { useTheme } from 'providers/Theme/index';
import { buildHarRequest } from 'utils/codegenerator/har';
import { useSelector } from 'react-redux';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import toast from 'react-hot-toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCopy } from '@fortawesome/free-solid-svg-icons';

const CodeView = ({ language, item }) => {
  const { storedTheme } = useTheme();
  const preferences = useSelector((state) => state.app.preferences);
  const { target, client, language: lang } = language;
  const headers = item.draft ? get(item, 'draft.request.headers') : get(item, 'request.headers');
  let snippet = '';

  try {
    snippet = new HTTPSnippet(buildHarRequest({ request: item.request, headers })).convert(target, client);
  } catch (e) {
    console.error(e);
    snippet = 'Error generating code snippet';
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <CopyToClipboard text={snippet} onCopy={() => toast.success('Copied to clipboard!')}>
          <FontAwesomeIcon icon={faCopy} style={{ cursor: 'pointer' }} />
        </CopyToClipboard>
      </div>
      <CodeEditor
        readOnly
        value={snippet}
        font={get(preferences, 'font.codeFont', 'default')}
        theme={storedTheme}
        mode={lang}
      />
    </>
  );
};

export default CodeView;
