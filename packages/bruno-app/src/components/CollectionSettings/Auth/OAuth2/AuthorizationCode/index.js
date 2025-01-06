import React from 'react';
import get from 'lodash/get';
import { useTheme } from 'providers/Theme';
import { useDispatch } from 'react-redux';
import SingleLineEditor from 'components/SingleLineEditor';
import { saveCollectionRoot, sendCollectionOauth2Request } from 'providers/ReduxStore/slices/collections/actions';
import StyledWrapper from './StyledWrapper';
import { inputsConfig } from './inputsConfig';
import { updateCollectionAuth } from 'providers/ReduxStore/slices/collections/index';
import { clearOauth2Cache } from 'utils/network/index';
import toast from 'react-hot-toast';

const OAuth2AuthorizationCode = ({ collection }) => {
  const dispatch = useDispatch();
  const { storedTheme } = useTheme();

  const oAuth = collection.draft ? get(collection, 'draft.request.auth.oauth2', {}) : get(collection, 'root.request.auth.oauth2', {});

  const handleRun = async () => {
    dispatch(sendCollectionOauth2Request(collection.uid));
  };

  const handleSave = () => dispatch(saveCollectionRoot(collection.uid));

  const { callbackUrl, authorizationUrl, accessTokenUrl, clientId, clientSecret, scope, state, pkce } = oAuth;

  const handleChange = (key, value) => {
    dispatch(
      updateCollectionAuth({
        mode: 'oauth2',
        collectionUid: collection.uid,
        content: {
          grantType: 'authorization_code',
          callbackUrl,
          authorizationUrl,
          accessTokenUrl,
          clientId,
          clientSecret,
          scope,
          state,
          pkce,
          [key]: value
        }
      })
    );
  };

  const handlePKCEToggle = (e) => {
    dispatch(
      updateCollectionAuth({
        mode: 'oauth2',
        collectionUid: collection.uid,
        content: {
          grantType: 'authorization_code',
          callbackUrl,
          authorizationUrl,
          accessTokenUrl,
          clientId,
          clientSecret,
          scope,
          state,
          pkce: !Boolean(oAuth?.['pkce'])
        }
      })
    );
  };

  const handleClearCache = (e) => {
    clearOauth2Cache(collection?.uid)
      .then(() => {
        toast.success('cleared cache successfully');
      })
      .catch((err) => {
        toast.error(err.message);
      });
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
      <div className="flex flex-row w-full gap-4" key="pkce">
        <label className="block font-medium">Use PKCE</label>
        <input
          className="cursor-pointer"
          type="checkbox"
          checked={Boolean(oAuth?.['pkce'])}
          onChange={handlePKCEToggle}
        />
      </div>
      <div className="flex flex-row gap-4">
        <button onClick={handleRun} className="submit btn btn-sm btn-secondary w-fit">
          Get Access Token
        </button>
        <button onClick={handleClearCache} className="submit btn btn-sm btn-secondary w-fit">
          Clear Cache
        </button>
      </div>
    </StyledWrapper>
  );
};

export default OAuth2AuthorizationCode;
