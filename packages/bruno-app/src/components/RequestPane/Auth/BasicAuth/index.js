import React from 'react';
import SensitiveFieldWarning from 'components/SensitiveFieldWarning';
import { useIdentifySensitiveField } from 'hooks/useIdentifySensitiveField';
import get from 'lodash/get';
import { useTheme } from 'providers/Theme';
import { useDispatch } from 'react-redux';
import SingleLineEditor from 'components/SingleLineEditor';
import { updateAuth } from 'providers/ReduxStore/slices/collections';
import { sendRequest, saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import StyledWrapper from './StyledWrapper';
import { getSensitiveFieldWarning } from 'utils/common/sensitiveField';

const BasicAuth = ({ item, collection, updateAuth, request, save }) => {
  const dispatch = useDispatch();
  const { storedTheme } = useTheme();

  const basicAuth = get(request, 'auth.basic', {});
  const { isSensitive } = useIdentifySensitiveField(collection);

  const handleRun = () => dispatch(sendRequest(item, collection.uid));
  
  const handleSave = () => {
    save();
  };

  const handleUsernameChange = (username) => {
    dispatch(
      updateAuth({
        mode: 'basic',
        collectionUid: collection.uid,
        itemUid: item.uid,
        content: {
          username: username || '',
          password: basicAuth.password || ''
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
          username: basicAuth.username || '',
          password: password || ''
        }
      })
    );
  };

  const passwordValue = basicAuth.password || '';
  const { showWarning: envVarWarning } = isSensitive(passwordValue, true);
  const { showWarning, message: warningMessage } = getSensitiveFieldWarning(passwordValue, envVarWarning);

  return (
    <StyledWrapper className="mt-2 w-full">
      <label className="block font-medium mb-2">Username</label>
      <div className="single-line-editor-wrapper mb-2">
        <SingleLineEditor
          value={basicAuth.username || ''}
          theme={storedTheme}
          onSave={handleSave}
          onChange={(val) => handleUsernameChange(val)}
          onRun={handleRun}
          collection={collection}
          item={item}
        />
      </div>

      <label className="block font-medium mb-2">Password</label>
      <div className="single-line-editor-wrapper flex items-center">
        <SingleLineEditor
          value={basicAuth.password || ''}
          theme={storedTheme}
          onSave={handleSave}
          onChange={(val) => handlePasswordChange(val)}
          onRun={handleRun}
          collection={collection}
          item={item}
          isSecret={true}
        />
        <SensitiveFieldWarning showWarning={showWarning} fieldName="basic-password" message={warningMessage} />
      </div>
    </StyledWrapper>
  );
};

export default BasicAuth;
