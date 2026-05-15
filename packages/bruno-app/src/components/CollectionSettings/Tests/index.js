import React, { useRef } from 'react';
import get from 'lodash/get';
import { useDispatch, useSelector } from 'react-redux';
import CodeEditor from 'components/CodeEditor';
import { updateCollectionTests } from 'providers/ReduxStore/slices/collections';
import { saveCollectionSettings } from 'providers/ReduxStore/slices/collections/actions';
import { useTheme } from 'providers/Theme';
import StyledWrapper from './StyledWrapper';
import Button from 'ui/Button';
import { usePersistedState } from 'hooks/usePersistedState';
import { useTranslation } from 'react-i18next';

const Tests = ({ collection }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const testsEditorRef = useRef(null);
  const tests = collection.draft?.root ? get(collection, 'draft.root.request.tests', '') : get(collection, 'root.request.tests', '');

  const { displayedTheme } = useTheme();
  const preferences = useSelector((state) => state.app.preferences);
  const [testsScroll, setTestsScroll] = usePersistedState({ key: `collection-tests-scroll-${collection.uid}`, default: 0 });

  const onEdit = (value) => {
    dispatch(
      updateCollectionTests({
        tests: value,
        collectionUid: collection.uid
      })
    );
  };

  const handleSave = () => dispatch(saveCollectionSettings(collection.uid));

  return (
    <StyledWrapper className="w-full flex flex-col h-full">
      <div className="text-xs mb-4 text-muted">{t('COLLECTION_TESTS.DESC')}</div>
      <CodeEditor
        ref={testsEditorRef}
        collection={collection}
        docKey="collection-tests"
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
          {t('COLLECTION_TESTS.SAVE')}
        </Button>
      </div>
    </StyledWrapper>
  );
};

export default Tests;
