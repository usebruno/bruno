import React from 'react';
import get from 'lodash/get';
import { useTheme } from 'providers/Theme';
import { useDispatch } from 'react-redux';
import SingleLineEditor from 'components/SingleLineEditor';
import { sendRequest, saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import StyledWrapper from './StyledWrapper';

const DigestAuth = ({ item, collection, updateAuth, request, save }) => {
  const dispatch = useDispatch();
  const { storedTheme } = useTheme();

  const digestAuth = get(request, 'auth.digest', {});

  const handleRun = () => dispatch(sendRequest(item, collection.uid));
  
  const handleSave = () => {
    save();
  };

  const handleUsernameChange = (username) => {
    dispatch(
      updateAuth({
        mode: 'digest',
        collectionUid: collection.uid,
        itemUid: item.uid,
        content: {
          username: username,
          password: digestAuth.password
        }
      })
    );
  };

  const handlePasswordChange = (password) => {
    dispatch(
      updateAuth({
        mode: 'digest',
        collectionUid: collection.uid,
        itemUid: item.uid,
        content: {
          username: digestAuth.username,
          password: password
        }
      })
    );
  };

  return (
    <StyledWrapper className="mt-2 w-full">
      <label className="block font-medium mb-2">Username</label>
      <div className="single-line-editor-wrapper mb-2">
        <SingleLineEditor
          value={digestAuth.username || ''}
          theme={storedTheme}
          onSave={handleSave}
          onChange={(val) => handleUsernameChange(val)}
          onRun={handleRun}
          collection={collection}
          item={item}
        />
      </div>

      <label className="block font-medium mb-2">Password</label>
      <div className="single-line-editor-wrapper">
        <SingleLineEditor
          value={digestAuth.password || ''}
          theme={storedTheme}
          onSave={handleSave}
          onChange={(val) => handlePasswordChange(val)}
          onRun={handleRun}
          collection={collection}
          item={item}
          isSecret={true}
        />
      </div>
    </StyledWrapper>
  );
};

export default DigestAuth;
