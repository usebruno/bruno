import React from 'react';
import get from 'lodash/get';
import { useDispatch } from 'react-redux';
import CodeEditor from 'components/CodeEditor';
import { updateRequestScript } from 'providers/ReduxStore/slices/collections';
import { sendRequest, saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import { useTheme } from 'providers/Theme';
import StyledWrapper from './StyledWrapper';

const Script = ({ item, collection }) => {
  const dispatch = useDispatch();
  const script = item.draft ? get(item, 'draft.request.script') : get(item, 'request.script');

  const {
    storedTheme
  } = useTheme();

  const onEdit = (value) => {
    dispatch(
      updateRequestScript({
        script: value,
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
        collection={collection} value={script || ''}
        theme={storedTheme}
        onEdit={onEdit}
        mode='javascript'
        onRun={onRun}
        onSave={onSave}
      />
    </StyledWrapper>
  );
};

export default Script;
