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
import { useTranslation } from 'react-i18next';

const CodeView = ({ language, item }) => {
  const { t } = useTranslation();
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

  const snippet = useMemo(() => {
    return generateSnippet({
      language,
      item,
      collection,
      shouldInterpolate: generateCodePrefs.shouldInterpolate
    });
  }, [language, item, collection, generateCodePrefs.shouldInterpolate]);

  return (
    <StyledWrapper>
      <CopyToClipboard
        text={snippet}
        options={{ format: 'text/plain' }}
        onCopy={() => toast.success(t('SIDEBAR_COLLECTIONS.COPIED_TO_CLIPBOARD'))}
      >
        <button className="copy-to-clipboard">
          <IconCopy size={20} strokeWidth={1.5} />
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
