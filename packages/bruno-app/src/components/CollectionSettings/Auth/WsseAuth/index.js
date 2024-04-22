//TODO: wsse
import React from 'react';
import get from 'lodash/get';
import { useTheme } from 'providers/Theme';
import { useDispatch } from 'react-redux';
import SingleLineEditor from 'components/SingleLineEditor';
import { updateCollectionAuth } from 'providers/ReduxStore/slices/collections';
import { saveCollectionRoot } from 'providers/ReduxStore/slices/collections/actions';
import StyledWrapper from './StyledWrapper';

const WsseAuth = ({ collection }) => {
  const dispatch = useDispatch();
  const { storedTheme } = useTheme();

  const wsseAuth = get(collection, 'root.request.auth.wsse', {});

  const handleSave = () => dispatch(saveCollectionRoot(collection.uid));

  const handleUserChange = (user) => {
    dispatch(
      updateCollectionAuth({
        mode: 'wsse',
        collectionUid: collection.uid,
        content: {
          user: user,
          password: wsseAuth.password
        }
      })
    );
  };

  const handlePasswordChange = (password) => {
    dispatch(
      updateCollectionAuth({
        mode: 'wsse',
        collectionUid: collection.uid,
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
          collection={collection}
        />
      </div>
    </StyledWrapper>
  );
};

export default WsseAuth;
