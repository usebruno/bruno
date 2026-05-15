import React from 'react';
import SensitiveFieldWarning from 'components/SensitiveFieldWarning';
import { useDetectSensitiveField } from 'hooks/useDetectSensitiveField';
import get from 'lodash/get';
import { useTheme } from 'providers/Theme';
import { useDispatch } from 'react-redux';
import SingleLineEditor from 'components/SingleLineEditor';
import { sendRequest, saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import StyledWrapper from './StyledWrapper';
import { useTranslation } from 'react-i18next';

const DigestAuth = ({ item, collection, updateAuth, request, save }) => {
  const dispatch = useDispatch();
  const { storedTheme } = useTheme();
  const { t } = useTranslation();

  const digestAuth = get(request, 'auth.digest', {});
  const { isSensitive } = useDetectSensitiveField(collection);
  const { showWarning, warningMessage } = isSensitive(digestAuth?.password);

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
          username: username || '',
          password: digestAuth.password || ''
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
          username: digestAuth.username || '',
          password: password || ''
        }
      })
    );
  };

  return (
    <StyledWrapper className="mt-2 w-full">
      <label className="block mb-1">{t('REQUEST_AUTH.USERNAME')}</label>
      <div className="single-line-editor-wrapper mb-3">
        <SingleLineEditor
          value={digestAuth.username || ''}
          theme={storedTheme}
          onSave={handleSave}
          onChange={(val) => handleUsernameChange(val)}
          onRun={handleRun}
          collection={collection}
          item={item}
          isCompact
        />
      </div>

      <label className="block mb-1">{t('REQUEST_AUTH.PASSWORD')}</label>
      <div className="single-line-editor-wrapper flex items-center">
        <SingleLineEditor
          value={digestAuth.password || ''}
          theme={storedTheme}
          onSave={handleSave}
          onChange={(val) => handlePasswordChange(val)}
          onRun={handleRun}
          collection={collection}
          item={item}
          isSecret={true}
          isCompact
        />
        {showWarning && <SensitiveFieldWarning fieldName="digest-password" warningMessage={warningMessage} />}
      </div>
    </StyledWrapper>
  );
};

export default DigestAuth;
