import React, { useRef } from 'react';
import get from 'lodash/get';
import { useDispatch, useSelector } from 'react-redux';
import CodeEditor from 'components/CodeEditor';
import { updateFolderTests } from 'providers/ReduxStore/slices/collections';
import { saveFolderRoot } from 'providers/ReduxStore/slices/collections/actions';
import { useTheme } from 'providers/Theme';
import StyledWrapper from './StyledWrapper';
import Button from 'ui/Button';
import { usePersistedState } from 'hooks/usePersistedState';
import { useTranslation } from 'react-i18next';

const Tests = ({ collection, folder }) => {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const testsEditorRef = useRef(null);
  const tests = folder.draft ? get(folder, 'draft.request.tests', '') : get(folder, 'root.request.tests', '');

  const { displayedTheme } = useTheme();
  const preferences = useSelector((state) => state.app.preferences);
  const [testsScroll, setTestsScroll] = usePersistedState({ key: `folder-tests-scroll-${folder.uid}`, default: 0 });

  const onEdit = (value) => {
    dispatch(
      updateFolderTests({
        tests: value,
        collectionUid: collection.uid,
        folderUid: folder.uid
      })
    );
  };

  const handleSave = () => dispatch(saveFolderRoot(collection.uid, folder.uid));

  return (
    <StyledWrapper className="w-full flex flex-col h-full">
      <div className="text-xs mb-4 text-muted">{t('FOLDER_SETTINGS.TESTS_DESCRIPTION')}</div>
      <CodeEditor
        ref={testsEditorRef}
        collection={collection}
        docKey="folder-tests"
        value={tests || ''}
        theme={displayedTheme}
        onEdit={onEdit}
        mode="javascript"
        onSave={handleSave}
        font={get(preferences, 'font.codeFont', 'default')}
        fontSize={get(preferences, 'font.codeFontSize')}
        showHintsFor={['req', 'res', 'bru']}
        initialScroll={testsScroll}
        onScroll={setTestsScroll}
      />

      <div className="mt-6">
        <Button type="submit" size="sm" onClick={handleSave}>
          {t('FOLDER_SETTINGS.SAVE')}
        </Button>
      </div>
    </StyledWrapper>
  );
};

export default Tests;
