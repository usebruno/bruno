import React from 'react';
import get from 'lodash/get';
import { useTheme } from 'providers/Theme';
import { useDispatch } from 'react-redux';
import SingleLineEditor from 'components/SingleLineEditor';
import { updateAuth } from 'providers/ReduxStore/slices/collections';
import { sendRequest, saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import StyledWrapper from './StyledWrapper';

const WsseAuth = ({ item, collection }) => {
  const dispatch = useDispatch();
  const { storedTheme } = useTheme();

  const wsseAuth = item.draft ? get(item, 'draft.request.auth.wsse', {}) : get(item, 'request.auth.wsse', {});

  const handleRun = () => dispatch(sendRequest(item, collection.uid));
  const handleSave = () => dispatch(saveRequest(item.uid, collection.uid));

  const handleUserChange = (user) => {
    dispatch(
      updateAuth({
        mode: 'wsse',
        collectionUid: collection.uid,
        itemUid: item.uid,
        content: {
          user: user,
          password: wsseAuth.password
        }
      })
    );
  };

  const handlePasswordChange = (password) => {
    dispatch(
      updateAuth({
        mode: 'wsse',
        collectionUid: collection.uid,
        itemUid: item.uid,
        content: {
          user: wsseAuth.user,
          password: password
        }
      })
    );
  };

  return (
    <StyledWrapper className="mt-2 w-full">
      <label className="block font-medium mb-2">User</label>
      <div className="single-line-editor-wrapper mb-2">
        <SingleLineEditor
          value={wsseAuth.user || ''}
          theme={storedTheme}
          onSave={handleSave}
          onChange={(val) => handleUserChange(val)}
          onRun={handleRun}
          collection={collection}
        />
      </div>

      <label className="block font-medium mb-2">Password</label>
      <div className="single-line-editor-wrapper">
        <SingleLineEditor
          value={wsseAuth.password || ''}
          theme={storedTheme}
          onSave={handleSave}
          onChange={(val) => handlePasswordChange(val)}
          onRun={handleRun}
          collection={collection}
        />
      </div>
    </StyledWrapper>
  );
};

export default WsseAuth;
