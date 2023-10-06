import React from 'react';
import { useDispatch } from 'react-redux';
import CodeEditor from 'components/CodeEditor';
import { updateRequestGraphqlVariables } from 'providers/ReduxStore/slices/collections';
import { sendRequest, saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import { useTheme } from 'providers/Theme';
import { usePreferences } from 'providers/Preferences';
import StyledWrapper from './StyledWrapper';

const GraphQLVariables = ({ variables, item, collection }) => {
  const dispatch = useDispatch();

  const { storedTheme } = useTheme();
  const { preferences } = usePreferences();

  const onEdit = (value) => {
    dispatch(
      updateRequestGraphqlVariables({
        variables: value,
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
        collection={collection}
        value={variables || ''}
        theme={storedTheme}
        font={preferences.codeFont}
        onEdit={onEdit}
        mode="javascript"
        onRun={onRun}
        onSave={onSave}
      />
    </StyledWrapper>
  );
};

export default GraphQLVariables;
