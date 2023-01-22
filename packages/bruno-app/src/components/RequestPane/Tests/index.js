import React from 'react';
import get from 'lodash/get';
import { useDispatch } from 'react-redux';
import CodeEditor from 'components/CodeEditor';
import { updateRequestTests } from 'providers/ReduxStore/slices/collections';
import { sendRequest, saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import StyledWrapper from './StyledWrapper';

const Tests = ({ item, collection }) => {
  const dispatch = useDispatch();
  const tests = item.draft ? get(item, 'draft.request.tests') : get(item, 'request.tests');

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
    <StyledWrapper className="w-full">
      <CodeEditor
        collection={collection} value={tests || ''}
        onEdit={onEdit}
        mode='javascript'
        onRun={onRun}
        onSave={onSave}
      />
    </StyledWrapper>
  );
};

export default Tests;
