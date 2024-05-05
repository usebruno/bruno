import React from 'react';
import get from 'lodash/get';
import { useTheme } from 'providers/Theme';
import { useDispatch } from 'react-redux';
import SingleLineEditor from 'components/SingleLineEditor';
import { saveCollectionRoot, sendCollectionOauth2Request } from 'providers/ReduxStore/slices/collections/actions';
import StyledWrapper from './StyledWrapper';
import { inputsConfig } from './inputsConfig';
import { updateCollectionAuth } from 'providers/ReduxStore/slices/collections';

const OAuth2PasswordCredentials = ({ collection }) => {
  const dispatch = useDispatch();
  const { storedTheme } = useTheme();

  const oAuth = get(collection, 'root.request.auth.oauth2', {});

  const handleRun = async () => {
    dispatch(sendCollectionOauth2Request(collection.uid));
  };

  const handleSave = () => dispatch(saveCollectionRoot(collection.uid));

  const { accessTokenUrl, username, password, clientId, clientSecret, scope } = oAuth;

  const handleChange = (key, value) => {
    dispatch(
      updateCollectionAuth({
        mode: 'oauth2',
        collectionUid: collection.uid,
        content: {
          grantType: 'password',
          accessTokenUrl,
          username,
          password,
          clientId,
          clientSecret,
          scope,
          [key]: value
        }
      })
    );
  };

  return (
    <StyledWrapper className="mt-2 flex w-full gap-4 flex-col">
      {inputsConfig.map((input) => {
        const { key, label, isSecret } = input;
        return (
          <div className="flex flex-col w-full gap-1" key={`input-${key}`}>
            <label className="block font-medium">{label}</label>
            <div className="single-line-editor-wrapper">
              <SingleLineEditor
                value={oAuth[key] || ''}
                theme={storedTheme}
                onSave={handleSave}
                onChange={(val) => handleChange(key, val)}
                onRun={handleRun}
                collection={collection}
                isSecret={isSecret}
              />
            </div>
          </div>
        );
      })}
    </StyledWrapper>
  );
};

export default OAuth2PasswordCredentials;
