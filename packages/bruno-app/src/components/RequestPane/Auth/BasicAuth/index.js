import React from 'react';
import get from 'lodash/get';
import { useTheme } from 'providers/Theme';
import { useDispatch } from 'react-redux';
import CodeEditor from 'src/components/CodeEditor';
import { updateAuth } from 'providers/ReduxStore/slices/collections';
import { sendRequest, saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import StyledWrapper from './StyledWrapper';

const BasicAuth = ({ item, collection }) => {
  const dispatch = useDispatch();
  const { storedTheme } = useTheme();

  const basicAuth = item.draft ? get(item, 'draft.request.auth.basic', {}) : get(item, 'request.auth.basic', {});

  const handleRun = () => dispatch(sendRequest(item, collection.uid));
  const handleSave = () => dispatch(saveRequest(item.uid, collection.uid));

  const handleUsernameChange = (username) => {
    dispatch(
      updateAuth({
        mode: 'basic',
        collectionUid: collection.uid,
        itemUid: item.uid,
        content: {
          username: username,
          password: basicAuth.password
        }
      })
    );
  };

  const handlePasswordChange = (password) => {
    dispatch(
      updateAuth({
        mode: 'basic',
        collectionUid: collection.uid,
        itemUid: item.uid,
        content: {
          username: basicAuth.username,
          password: password
        }
      })
    );
  };

  return (
    <StyledWrapper className="mt-2 w-full">
      <label className="block font-medium mb-2">Username</label>
      <div className="single-line-editor-wrapper mb-2">
        <CodeEditor
          singleLine
          value={basicAuth.username || ''}
          theme={storedTheme}
          onSave={handleSave}
          onChange={(val) => handleUsernameChange(val)}
          onRun={handleRun}
          collection={collection}
        />
      </div>

      <label className="block font-medium mb-2">Password</label>
      <div className="single-line-editor-wrapper">
        <CodeEditor
          singleLine
          value={basicAuth.password || ''}
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

export default BasicAuth;
