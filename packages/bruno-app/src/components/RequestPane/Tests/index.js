import React, { useMemo, useRef } from 'react';
import get from 'lodash/get';
import { useDispatch, useSelector } from 'react-redux';
import CodeEditor from 'components/CodeEditor';
import AIAssist from 'components/AIAssist';
import { buildRequestContextFromItem } from 'utils/ai';
import { updateRequestTests } from 'providers/ReduxStore/slices/collections';
import { sendRequest, saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import { useTheme } from 'providers/Theme';
import { usePersistedState } from 'hooks/usePersistedState';
import { useFocusErrorLine } from 'hooks/useFocusErrorLine';

const Tests = ({ item, collection }) => {
  const dispatch = useDispatch();
  const testsEditorRef = useRef(null);
  const tests = item.draft ? get(item, 'draft.request.tests') : get(item, 'request.tests');

  const { displayedTheme } = useTheme();
  const preferences = useSelector((state) => state.app.preferences);
  const [testsScroll, setTestsScroll] = usePersistedState({ key: `request-tests-scroll-${item.uid}`, default: 0 });

  const onEdit = (value) => {
    dispatch(
      updateRequestTests({
        tests: value,
        itemUid: item.uid,
        collectionUid: collection.uid
      })
    );
  };

  const onRun = () => dispatch(sendRequest(item, collection.uid));
  const onSave = () => dispatch(saveRequest(item.uid, collection.uid));

  useFocusErrorLine({
    uid: item.uid,
    editorRef: testsEditorRef,
    scriptPhase: 'test'
  });

  const requestContext = useMemo(() => buildRequestContextFromItem(item), [item]);

  return (
    <div data-testid="test-script-editor" className="relative h-full">
      <CodeEditor
        ref={testsEditorRef}
        collection={collection}
        docKey="tests"
        value={tests || ''}
        theme={displayedTheme}
        font={get(preferences, 'font.codeFont', 'default')}
        fontSize={get(preferences, 'font.codeFontSize')}
        onEdit={onEdit}
        mode="javascript"
        onRun={onRun}
        onSave={onSave}
        showHintsFor={['req', 'res', 'bru']}
        initialScroll={testsScroll}
        onScroll={setTestsScroll}
      />
      <AIAssist scriptType="tests" currentScript={tests || ''} requestContext={requestContext} onApply={onEdit} />
    </div>
  );
};

export default Tests;
