import React from 'react';
import get from 'lodash/get';
import { useDispatch, useSelector } from 'react-redux';
import CodeEditor from 'components/CodeEditor';
import { updateRequestGraphqlVariables } from 'providers/ReduxStore/slices/collections';
import { sendRequest, saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import { useTheme } from 'providers/Theme';
import StyledWrapper from './StyledWrapper';
import { format, applyEdits } from 'jsonc-parser';
import { IconWand } from '@tabler/icons';
import toast from 'react-hot-toast';

const GraphQLVariables = ({ variables, item, collection }) => {
  const dispatch = useDispatch();

  const { displayedTheme } = useTheme();
  const preferences = useSelector((state) => state.app.preferences);

  const onPrettify = () => {
    if (!variables) return;
    try {
      const edits = format(variables, undefined, { tabSize: 2, insertSpaces: true });
      const prettyVariables = applyEdits(variables, edits);
      dispatch(
        updateRequestGraphqlVariables({
          variables: prettyVariables,
          itemUid: item.uid,
          collectionUid: collection.uid
        })
      );
      toast.success('Variables prettified');
    } catch (error) {
      console.error(error);
      toast.error('Error occurred while prettifying GraphQL variables');
    }
  };

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
    <StyledWrapper className="w-full relative">
      <button
        className="btn-add-param text-link px-4 py-4 select-none absolute top-0 right-0 z-10"
        onClick={onPrettify}
        title={'Prettify'}
      >
        <IconWand size={20} strokeWidth={1.5} />
      </button>
      <CodeEditor
        collection={collection}
        value={variables || ''}
        theme={displayedTheme}
        font={get(preferences, 'font.codeFont', 'default')}
        fontSize={get(preferences, 'font.codeFontSize')}
        onEdit={onEdit}
        mode="javascript"
        onRun={onRun}
        onSave={onSave}
      />
    </StyledWrapper>
  );
};

export default GraphQLVariables;
