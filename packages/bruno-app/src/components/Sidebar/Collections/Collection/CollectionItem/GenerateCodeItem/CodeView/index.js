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
import { generateSnippet } from '../utils/snippet-generator';

const CodeView = ({ language, item, shouldInterpolate }) => {
  const { displayedTheme } = useTheme();
  const preferences = useSelector((state) => state.app.preferences);
  const { globalEnvironments, activeGlobalEnvironmentUid } = useSelector((state) => state.globalEnvironments);

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

  const snippet = useMemo(() => {
    return generateSnippet({ language, item, collection, shouldInterpolate });
  }, [language, item, collection, shouldInterpolate]);

  return (
    <StyledWrapper>
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
          item={item}
          value={snippet}
          font={get(preferences, 'font.codeFont', 'default')}
          fontSize={get(preferences, 'font.codeFontSize')}
          theme={displayedTheme}
          mode={language.language}
          enableVariableHighlighting={true}
        />
      </div>
    </StyledWrapper>
  );
};

export default CodeView;
