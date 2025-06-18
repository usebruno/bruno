import React from 'react';
import get from 'lodash/get';
import { useDispatch, useSelector } from 'react-redux';
import CodeEditor from 'components/CodeEditor';
import { updateRequestTests } from 'providers/ReduxStore/slices/collections';
import { sendRequest, saveRequest, saveMultipleRequests } from 'providers/ReduxStore/slices/collections/actions';
import { useTheme } from 'providers/Theme';
import { extractDrafts } from 'utils/collections/index';

const Tests = ({ item, collection }) => {
  const dispatch = useDispatch();
  const tests = item.draft ? get(item, 'draft.request.tests') : get(item, 'request.tests');

  const { displayedTheme } = useTheme();
  const preferences = useSelector((state) => state.app.preferences);

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
  const onSaveAll = () => {
    dispatch(saveMultipleRequests(extractDrafts(collection)));
  };

  return (
    <CodeEditor
      collection={collection}
      value={tests || ''}
      theme={displayedTheme}
      font={get(preferences, 'font.codeFont', 'default')}
      fontSize={get(preferences, 'font.codeFontSize')}
      onEdit={onEdit}
      mode="javascript"
      onRun={onRun}
      onSave={onSave}
      onSaveAll={onSaveAll}
    />
  );
};

export default Tests;
