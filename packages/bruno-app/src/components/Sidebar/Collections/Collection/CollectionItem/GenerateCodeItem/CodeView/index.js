import CodeEditor from 'components/CodeEditor/index';
import get from 'lodash/get';
import { useTheme } from 'providers/Theme/index';
import StyledWrapper from './StyledWrapper';
import { useSelector } from 'react-redux';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import toast from 'react-hot-toast';
import { IconCopy } from '@tabler/icons';
import { findCollectionByItemUid, getGlobalEnvironmentVariables } from 'utils/collections/index';
import { cloneDeep } from 'lodash';
import { useMemo } from 'react';
import { buildHarRequest } from 'utils/codegenerator/har';
import { getAuthHeaders } from '../../../../../../../utils/codegenerator/auth';
import { HTTPSnippet } from 'httpsnippet';
const CodeView = ({ language, item }) => {
  const { displayedTheme } = useTheme();
  const preferences = useSelector((state) => state.app.preferences);
  const { globalEnvironments, activeGlobalEnvironmentUid } = useSelector((state) => state.globalEnvironments);
  const generateCodePrefs = useSelector((state) => state.app.generateCode);

  let collectionOriginal = findCollectionByItemUid(
    useSelector((state) => state.collections.collections),
    item.uid
  );

  const collection = useMemo(() => {
    const c = cloneDeep(collectionOriginal);
    const globalEnvironmentVariables = getGlobalEnvironmentVariables({
      globalEnvironments,
      activeGlobalEnvironmentUid
    });
    c.globalEnvironmentVariables = globalEnvironmentVariables;
    return c;
  }, [collectionOriginal, globalEnvironments, activeGlobalEnvironmentUid]);

  // add selected global env variables to the collection object
  const globalEnvironmentVariables = getGlobalEnvironmentVariables({ globalEnvironments, activeGlobalEnvironmentUid });
  collection.globalEnvironmentVariables = globalEnvironmentVariables;

  const collectionRootAuth = collection?.root?.request?.auth;
  const requestAuth = item.draft ? get(item, 'draft.request.auth') : get(item, 'request.auth');
  const requestHeaders = item?.request?.headers;
  const headers = [
    ...getAuthHeaders(collectionRootAuth, requestAuth),
    ...(collection?.root?.request?.headers || []),
    ...(requestHeaders ?? [])
  ];

  const snippet = useMemo(() => {
    try {
      const request = cloneDeep(item.request);
      if (request.url) {
        request.url = decodeURIComponent(request.url);
      }
      const { target, client } = language;
      return new HTTPSnippet(buildHarRequest({ request: request, headers, type: item.type })).convert(target,
        client);
    } catch (e) {
      console.error(e);
      return 'Error generating code snippet';
    }
  }, [language, item, collection, generateCodePrefs.shouldInterpolate]);

  return (
    <StyledWrapper>
      <CopyToClipboard text={snippet} onCopy={() => toast.success('Copied to clipboard!')}>
        <button className="copy-to-clipboard">
          <IconCopy size={25} strokeWidth={1.5} />
        </button>
      </CopyToClipboard>
      <div className="editor-content">
        <CodeEditor
          readOnly
          collection={collection}
          item={item}
          value={snippet}
          font={get(preferences, 'font.codeFont', 'default')}
          fontSize={get(preferences, 'font.codeFontSize')}
          theme={displayedTheme}
          mode={language.language}
          enableVariableHighlighting={true}
          showHintsFor={['variables']}
        />
      </div>
    </StyledWrapper>
  );
};

export default CodeView;
