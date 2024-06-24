import CodeEditor from 'components/CodeEditor/index';
import get from 'lodash/get';
import { HTTPSnippet } from 'httpsnippet';
import { useTheme } from 'providers/Theme/index';
import StyledWrapper from './StyledWrapper';
import { buildHarRequest } from 'utils/codegenerator/har';
import { useSelector } from 'react-redux';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import toast from 'react-hot-toast';
import { IconCopy } from '@tabler/icons';
import { findCollectionByItemUid } from '../../../../../../../utils/collections/index';
import { getAuthHeaders } from '../../../../../../../utils/codegenerator/auth';

const CodeView = ({ language, item }) => {
  const { displayedTheme } = useTheme();
  const preferences = useSelector((state) => state.app.preferences);
  const { target, client, language: lang } = language;
  const requestHeaders = item.draft ? get(item, 'draft.request.headers') : get(item, 'request.headers');
  const collection = findCollectionByItemUid(
    useSelector((state) => state.collections.collections),
    item.uid
  );

  const collectionRootAuth = collection?.root?.request?.auth;
  const requestAuth = item.draft ? get(item, 'draft.request.auth') : get(item, 'request.auth');

  const headers = [
    ...getAuthHeaders(collectionRootAuth, requestAuth),
    ...(collection?.root?.request?.headers || []),
    ...(requestHeaders || [])
  ];

  let snippet = '';
  try {
    snippet = new HTTPSnippet(buildHarRequest({ request: item.request, headers })).convert(target, client);
  } catch (e) {
    console.error(e);
    snippet = 'Error generating code snippet';
  }

  return (
    <>
      <StyledWrapper>
        <CopyToClipboard
          className="copy-to-clipboard"
          text={snippet}
          onCopy={() => toast.success('Copied to clipboard!')}
        >
          <IconCopy size={25} strokeWidth={1.5} />
        </CopyToClipboard>
        <CodeEditor
          readOnly
          value={snippet}
          font={get(preferences, 'font.codeFont', 'default')}
          theme={displayedTheme}
          mode={lang}
        />
      </StyledWrapper>
    </>
  );
};

export default CodeView;
