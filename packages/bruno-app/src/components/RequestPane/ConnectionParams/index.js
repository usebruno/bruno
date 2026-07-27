import React from 'react';
import get from 'lodash/get';
import { useDispatch, useSelector } from 'react-redux';
import CodeEditor from 'components/CodeEditor';
import { updateGraphqlSubscriptionConnectionParams } from 'providers/ReduxStore/slices/collections';
import { sendRequest, saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import { useTheme } from 'providers/Theme';

const ConnectionParams = ({ connectionParams, item, collection }) => {
  const dispatch = useDispatch();

  const { displayedTheme } = useTheme();
  const preferences = useSelector((state) => state.app.preferences);

  const onEdit = (value) => {
    dispatch(
      updateGraphqlSubscriptionConnectionParams({
        connectionParams: value,
        itemUid: item.uid,
        collectionUid: collection.uid
      })
    );
  };

  const onRun = () => dispatch(sendRequest(item, collection.uid));
  const onSave = () => dispatch(saveRequest(item.uid, collection.uid));

  return (
    <CodeEditor
      collection={collection}
      value={connectionParams || ''}
      theme={displayedTheme}
      font={get(preferences, 'font.codeFont', 'default')}
      fontSize={get(preferences, 'font.codeFontSize')}
      onEdit={onEdit}
      mode="application/json"
      onRun={onRun}
      onSave={onSave}
      enableVariableHighlighting={true}
      showHintsFor={['variables']}
    />
  );
};

export default ConnectionParams;
