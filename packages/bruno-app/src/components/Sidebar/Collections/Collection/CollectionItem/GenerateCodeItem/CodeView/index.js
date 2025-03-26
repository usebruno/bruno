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
import { findCollectionByItemUid, getGlobalEnvironmentVariables } from 'utils/collections/index';
import { getAuthHeaders } from 'utils/codegenerator/auth';
import { cloneDeep } from 'lodash';

const CodeView = ({ language, item }) => {
  const { displayedTheme } = useTheme();
  const preferences = useSelector((state) => state.app.preferences);
  const { globalEnvironments, activeGlobalEnvironmentUid } = useSelector((state) => state.globalEnvironments);
  const { target, client } = language;
  const requestHeaders = item.draft ? get(item, 'draft.request.headers') : get(item, 'request.headers');
  let _collection = findCollectionByItemUid(
    useSelector((state) => state.collections.collections),
    item.uid
  );

  let collection = cloneDeep(_collection);

  // add selected global env variables to the collection object
  const globalEnvironmentVariables = getGlobalEnvironmentVariables({ globalEnvironments, activeGlobalEnvironmentUid });
  collection.globalEnvironmentVariables = globalEnvironmentVariables;

  const collectionRootAuth = collection?.root?.request?.auth;
  const requestAuth = item.draft ? get(item, 'draft.request.auth') : get(item, 'request.auth');

  const headers = [
    ...getAuthHeaders(collectionRootAuth, requestAuth),
    ...(collection?.root?.request?.headers || []),
    ...(requestHeaders || [])
  ];

  let snippet = '';
  try {
    snippet = new HTTPSnippet(buildHarRequest({ request: item.request, headers, type: item.type })).convert(
      target,
      client
    );
  } catch (e) {
    console.error(e);
    snippet = 'Error generating code snippet';
  }

  return (
    <StyledWrapper>
      <div className="editor-wrapper">
        <CopyToClipboard
          text={snippet}
          onCopy={() => toast.success('Copied to clipboard!')}
        >
          <button className="copy-to-clipboard">
            <IconCopy size={25} strokeWidth={1.5} />
          </button>
        </CopyToClipboard>
        <div className="editor-content">
          <CodeEditor
            readOnly
            collection={collection}
            value={snippet}
            font={get(preferences, 'font.codeFont', 'default')}
            fontSize={get(preferences, 'font.codeFontSize', 12)}
            theme={displayedTheme}
            mode={language.language}
          />
        </div>
      </div>
    </StyledWrapper>
  );
};

export default CodeView;
