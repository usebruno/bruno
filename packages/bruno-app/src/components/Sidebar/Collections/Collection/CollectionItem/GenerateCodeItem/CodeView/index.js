import CodeEditor from 'components/CodeEditor/index';
import { get, cloneDeep } from 'lodash';
import { HTTPSnippet } from 'httpsnippet';
import { useTheme } from 'providers/Theme/index';
import StyledWrapper from './StyledWrapper';
import { buildHarRequest } from 'utils/codegenerator/har';
import { useSelector } from 'react-redux';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import toast from 'react-hot-toast';
import { IconCopy } from '@tabler/icons';
import { findCollectionByItemUid, getAllVariables } from '../../../../../../../utils/collections/index';
import { getAuthHeaders } from '../../../../../../../utils/codegenerator/auth';
import { interpolateVars } from '../../../../../../../utils/url/index';

const CodeView = ({ language, item }) => {
  const { displayedTheme } = useTheme();
  const preferences = useSelector((state) => state.app.preferences);
  const collections = useSelector((state) => state.collections.collections);

  const request = item.draft ? get(item, 'draft.request') : get(item, 'request');
  const requestClone = cloneDeep(request);
  const requestHeaders = item.draft ? get(item, 'draft.request.headers') : get(item, 'request.headers');
  const { target, client, language: lang } = language;

  const collection = findCollectionByItemUid(collections, item.uid);
  const allVars = getAllVariables(collection, item);
  interpolateVars(requestClone, allVars);

  const collectionRootAuth = collection?.root?.request?.auth;
  const requestAuth = item.draft ? get(item, 'draft.request.auth') : get(item, 'request.auth');

  const headers = [
    ...getAuthHeaders(collectionRootAuth, requestAuth),
    ...(collection?.root?.request?.headers || []),
    ...(requestHeaders || [])
  ];

  const generateSnippet = () => {
    try {
      return new HTTPSnippet(buildHarRequest({ request: requestClone, headers, type: item.type })).convert(
        target,
        client
      );
    } catch (e) {
      console.error('Error generating code snippet:', e);
      return 'Error generating code snippet';
    }
  };

  const snippet = generateSnippet();

  return (
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
        collection={collection}
        value={snippet}
        font={get(preferences, 'font.codeFont', 'default')}
        fontSize={get(preferences, 'font.codeFontSize')}
        theme={displayedTheme}
        mode={lang}
      />
    </StyledWrapper>
  );
};

export default CodeView;
