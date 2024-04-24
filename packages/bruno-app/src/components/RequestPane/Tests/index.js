import React, { useEffect } from 'react';
import get from 'lodash/get';
import { useDispatch, useSelector } from 'react-redux';
import CodeEditor from 'components/CodeEditor';
import { updateRequestTests } from 'providers/ReduxStore/slices/collections';
import { sendRequest, saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import { useTheme } from 'providers/Theme';
import StyledWrapper from './StyledWrapper';

const Tests = ({ item, collection }) => {
  const dispatch = useDispatch();
  const tests = item.draft ? get(item, 'draft.request.tests') : get(item, 'request.tests');

  const { displayedTheme } = useTheme();
  const preferences = useSelector((state) => state.app.preferences);
  const isResponsePaneDockedToBottom = useSelector(
    (state) => state.app.preferences.userInterface.responsePaneDockedToBottom
  );

  const onEdit = (value) => {
    dispatch(
      updateRequestTests({
        tests: value,
        itemUid: item.uid,
        collectionUid: collection.uid
      })
    );
  };

  const updateCodeMirrorHeight = (parentId, offsetTop, dockRightHeight) => {
    const codeMirror = document.querySelector(parentId + ' .CodeMirror');
    const pane = document.querySelector('.request-pane');
    if (codeMirror !== null && pane !== null) {
      let newHeight;
      if (isResponsePaneDockedToBottom) {
        newHeight = pane.offsetHeight - offsetTop + 'px';
      } else {
        newHeight = dockRightHeight;
      }
      if (newHeight !== codeMirror.style.height) {
        codeMirror.style.height = newHeight;
      }
    }
  };

  useEffect(() => {
    updateCodeMirrorHeight('#test-tab', 65, 'calc(100vh - 250px)');
  });

  const onRun = () => dispatch(sendRequest(item, collection.uid));
  const onSave = () => dispatch(saveRequest(item.uid, collection.uid));

  return (
    <StyledWrapper id="test-tab" className="w-full">
      <CodeEditor
        collection={collection}
        value={tests || ''}
        theme={displayedTheme}
        font={get(preferences, 'font.codeFont', 'default')}
        onEdit={onEdit}
        mode="javascript"
        onRun={onRun}
        onSave={onSave}
      />
    </StyledWrapper>
  );
};

export default Tests;
