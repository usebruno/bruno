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
import { findCollectionByItemUid, getGlobalEnvironmentVariables } from '../../../../../../../utils/collections/index';
import { cloneDeep } from 'lodash';

const CodeView = ({ language, item }) => {
  const { displayedTheme } = useTheme();
  const preferences = useSelector((state) => state.app.preferences);
  const { globalEnvironments, activeGlobalEnvironmentUid } = useSelector((state) => state.globalEnvironments);
  const { target, client, language: lang } = language;
  let _collection = findCollectionByItemUid(
    useSelector((state) => state.collections.collections),
    item.uid
  );

  let collection = cloneDeep(_collection);

  // add selected global env variables to the collection object
  const globalEnvironmentVariables = getGlobalEnvironmentVariables({ globalEnvironments, activeGlobalEnvironmentUid });
  collection.globalEnvironmentVariables = globalEnvironmentVariables;

  let snippet = '';
  try {
    snippet = new HTTPSnippet(buildHarRequest({ request: item.request, headers: item.request.headers, type: item.type })).convert(
      target,
      client
    );
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
          collection={collection}
          value={snippet}
          font={get(preferences, 'font.codeFont', 'default')}
          fontSize={get(preferences, 'font.codeFontSize')}
          theme={displayedTheme}
          mode={lang}
        />
      </StyledWrapper>
    </>
  );
};

export default CodeView;
