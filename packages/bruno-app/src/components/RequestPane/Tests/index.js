import React from 'react';
import get from 'lodash/get';
import { useDispatch, useSelector } from 'react-redux';
import { updateRequestTests } from 'providers/ReduxStore/slices/collections';
import { sendRequest, saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import { useTheme } from 'providers/Theme';
import StyledWrapper from './StyledWrapper';
import { MonacoEditor } from 'components/MonacoEditor';

const Tests = ({ item, collection }) => {
  const dispatch = useDispatch();
  const tests = item.draft ? get(item, 'draft.request.tests') : get(item, 'request.tests');

  const { storedTheme } = useTheme();
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

  return (
    <StyledWrapper className="w-full h-full">
      <MonacoEditor
        collection={collection}
        value={tests || ''}
        theme={storedTheme}
        font={get(preferences, 'font.codeFont', 'default')}
        onChange={onEdit}
        mode="javascript"
        onRun={onRun}
        onSave={onSave}
      />
    </StyledWrapper>
  );
};

export default Tests;
