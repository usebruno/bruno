import React, { useRef, forwardRef, useState } from 'react';
import get from 'lodash/get';
import { useTheme } from 'providers/Theme';
import { useDispatch } from 'react-redux';
import { IconCaretDown, IconLoader2 } from '@tabler/icons';
import Dropdown from 'components/Dropdown';
import SingleLineEditor from 'components/SingleLineEditor';
import { clearOauth2Cache, fetchOauth2Credentials, refreshOauth2Credentials } from 'providers/ReduxStore/slices/collections/actions';
import StyledWrapper from './StyledWrapper';
import { inputsConfig } from './inputsConfig';
import toast from 'react-hot-toast';
import Oauth2TokenViewer from '../Oauth2TokenViewer/index';
import { cloneDeep, find } from 'lodash';
import { collectionClearOauth2CredentialsByUrl } from 'providers/ReduxStore/slices/collections/index';
import { interpolateStringUsingCollectionAndItem } from 'utils/collections/index';

const OAuth2AuthorizationCode = ({ save, item = {}, request, handleRun, updateAuth, collection }) => {
  const dispatch = useDispatch();
  const { storedTheme } = useTheme();
  const dropdownTippyRef = useRef();
  const onDropdownCreate = (ref) => (dropdownTippyRef.current = ref);
  const [fetchingToken, toggleFetchingToken] = useState(false);
  const [refreshingToken, toggleRefreshingToken] = useState(false);

  const oAuth = get(request, 'auth.oauth2', {});
  
  const { callbackUrl, authorizationUrl, accessTokenUrl, clientId, clientSecret, scope, state, pkce, credentialsId, tokenPlacement, tokenPrefix, tokenQueryParamKey, reuseToken } = oAuth;

  const interpolatedAccessTokenUrl = interpolateStringUsingCollectionAndItem({ collection, item, string: accessTokenUrl });
  const credentialsData = find(collection?.oauth2Credentials, creds => creds?.url == interpolatedAccessTokenUrl && creds?.collectionUid == collection?.uid && creds?.credentialsId == credentialsId)?.credentials;

  const Icon = forwardRef((props, ref) => {
    return (
      <div ref={ref} className="flex items-center justify-end token-placement-label select-none">
        {tokenPlacement}
        <IconCaretDown className="caret ml-1 mr-1" size={14} strokeWidth={2} />
      </div>
    );
  });

  const handleFetchOauth2Credentials = async () => {
    let requestCopy = cloneDeep(request);
    requestCopy.oauth2 = requestCopy?.auth.oauth2;
    requestCopy.headers = {};
    toggleFetchingToken(true);
    try {
      await dispatch(fetchOauth2Credentials({ request: requestCopy, collection }));
      toggleFetchingToken(false);
    }
    catch(error) {
      console.error('could not fetch the token!');
      console.error(error);
      toggleFetchingToken(false);
    }
  }

  const handleRefreshToken = async () => {
    if (refreshingToken && !credentialsData?.refresh_token) return;
    let requestCopy = cloneDeep(request);
    requestCopy.oauth2 = requestCopy?.auth.oauth2;
    requestCopy.headers = {};
    toggleRefreshingToken(true);
    try {
      await dispatch(refreshOauth2Credentials({ request: requestCopy, collection }));
      toggleRefreshingToken(false);
    }
    catch(error) {
      await dispatch(collectionClearOauth2CredentialsByUrl({ url: interpolatedAccessTokenUrl, collectionUid: collection?.uid, credentialsId }));
      console.error('unable to refresh the token!');
      console.error(error);
      toggleRefreshingToken(false);
    }
  };

  const handleSave = () => {save();};

  const handleChange = (key, value) => {
    dispatch(
      updateAuth({
        mode: 'oauth2',
        collectionUid: collection.uid,
        itemUid: item.uid,
        content: {
          grantType: 'authorization_code',
          callbackUrl,
          authorizationUrl,
          accessTokenUrl,
          clientId,
          clientSecret,
          state,
          scope,
          pkce,
          credentialsId,
          tokenPlacement,
          tokenPrefix,
          tokenQueryParamKey,
          reuseToken,
          [key]: value
        }
      })
    );
  };

  const handlePKCEToggle = (e) => {
    dispatch(
      updateAuth({
        mode: 'oauth2',
        collectionUid: collection.uid,
        itemUid: item.uid,
        content: {
          grantType: 'authorization_code',
          callbackUrl,
          authorizationUrl,
          accessTokenUrl,
          clientId,
          clientSecret,
          state,
          scope,
          credentialsId,
          tokenPlacement,
          tokenPrefix,
          tokenQueryParamKey,
          reuseToken,
          pkce: !Boolean(oAuth?.['pkce'])
        }
      })
    );
  };

  const handleToggleReuseToken = (e) => {
    dispatch(
      updateAuth({
        mode: 'oauth2',
        collectionUid: collection.uid,
        itemUid: item.uid,
        content: {
          grantType: 'authorization_code',
          callbackUrl,
          authorizationUrl,
          accessTokenUrl,
          clientId,
          clientSecret,
          state,
          scope,
          credentialsId,
          tokenPlacement,
          tokenPrefix,
          tokenQueryParamKey,
          reuseToken: !Boolean(oAuth?.['reuseToken']),
          pkce
        }
      })
    );
  };

  const handleClearCache = (e) => {
    dispatch(clearOauth2Cache({ collectionUid: collection?.uid, url: accessTokenUrl }))
      .then(() => {
        toast.success('cleared cache successfully');
      })
      .catch((err) => {
        toast.error(err.message);
      });
  };

  return (
    <StyledWrapper className="mt-2 flex w-full gap-4 flex-col">
      <div className="flex flex-row w-full justify-start gap-2 mt-4" key="reuseToken">
        <input
          className="cursor-pointer"
          type="checkbox"
          checked={Boolean(reuseToken)}
          onChange={handleToggleReuseToken}
        />
        <label className="block font-medium">Use Existing Token</label>
      </div>
      <Oauth2TokenViewer handleRun={handleRun} collection={collection} item={item} url={accessTokenUrl} credentialsId={credentialsId} />
      {
        reuseToken ?
          <>
            <div className="flex flex-col w-full gap-1" key={`input-token-name`}>
              <label className="block font-medium">Credentials ID</label>
              <div className="single-line-editor-wrapper">
                <SingleLineEditor
                  value={oAuth['credentialsId'] || ''}
                  theme={storedTheme}
                  onSave={handleSave}
                  onChange={(val) => handleChange('credentialsId', val)}
                  onRun={handleRun}
                  collection={collection}
                  item={item}
                />
              </div>
            </div>
            <div className="flex flex-col w-full gap-1" key={`input-token-placement`}>
              <label className="block font-medium mb-2">Token Placement</label>
              <div className="inline-flex items-center cursor-pointer token-placement-selector w-fit">
                <Dropdown onCreate={onDropdownCreate} icon={<Icon />} placement="bottom-end">
                  <div
                    className="dropdown-item"
                    onClick={() => {
                      dropdownTippyRef.current.hide();
                      handleChange('tokenPlacement', 'header');
                    }}
                  >
                    Header
                  </div>
                  <div
                    className="dropdown-item"
                    onClick={() => {
                      dropdownTippyRef.current.hide();
                      handleChange('tokenPlacement', 'url');
                    }}
                  >
                    URL
                  </div>
                </Dropdown>
              </div>
            </div>
            {
              tokenPlacement === 'header' ?
                <div className="flex flex-col w-full gap-1" key={`input-token-prefix`}>
                  <label className="block font-medium">Token Prefix</label>
                  <div className="single-line-editor-wrapper">
                    <SingleLineEditor
                      value={oAuth['tokenPrefix'] || ''}
                      theme={storedTheme}
                      onSave={handleSave}
                      onChange={(val) => handleChange('tokenPrefix', val)}
                      onRun={handleRun}
                      collection={collection}
                    />
                  </div>
                </div>
                :
                <div className="flex flex-col w-full gap-1" key={`input-token-query-param-key`}>
                  <label className="block font-medium">Token Query Param Key</label>
                  <div className="single-line-editor-wrapper">
                    <SingleLineEditor
                      value={oAuth['tokenQueryParamKey'] || ''}
                      theme={storedTheme}
                      onSave={handleSave}
                      onChange={(val) => handleChange('tokenQueryParamKey', val)}
                      onRun={handleRun}
                      collection={collection}
                    />
                  </div>
                </div>
            }
            <div className="flex flex-row gap-4">
              {
                credentialsData?.refresh_token?
                  <button onClick={handleRefreshToken} className={`submit btn btn-sm btn-secondary w-fit flex flex-row ${refreshingToken? 'opacity-50': ''}`}>
                    Refresh Access Token{refreshingToken? <IconLoader2 className="animate-spin ml-2" size={18} strokeWidth={1.5} /> : ""}
                  </button>
                :
                  <button onClick={handleFetchOauth2Credentials} className={`submit btn btn-sm btn-secondary w-fit flex flex-row ${refreshingToken? 'opacity-50': ''}`}>
                    Get Access Token{fetchingToken? <IconLoader2 className="animate-spin ml-2" size={18} strokeWidth={1.5} /> : ""}
                  </button>
              }
              <button onClick={handleClearCache} className="submit btn btn-sm btn-secondary w-fit">
                Clear Cache
              </button>
            </div>
          </>
          :
          <>
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
                      item={item}
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
            <div className="flex flex-col w-full gap-1" key={`input-token-name`}>
              <label className="block font-medium">Credentials ID</label>
              <div className="single-line-editor-wrapper">
                <SingleLineEditor
                  value={oAuth['credentialsId'] || ''}
                  theme={storedTheme}
                  onSave={handleSave}
                  onChange={(val) => handleChange('credentialsId', val)}
                  onRun={handleRun}
                  collection={collection}
                  item={item}
                />
              </div>
            </div>
            <div className="flex flex-col w-full gap-1" key={`input-token-placement`}>
              <label className="block font-medium mb-2">Token Placement</label>
              <div className="inline-flex items-center cursor-pointer token-placement-selector w-fit">
                <Dropdown onCreate={onDropdownCreate} icon={<Icon />} placement="bottom-end">
                  <div
                    className="dropdown-item"
                    onClick={() => {
                      dropdownTippyRef.current.hide();
                      handleChange('tokenPlacement', 'header');
                    }}
                  >
                    Header
                  </div>
                  <div
                    className="dropdown-item"
                    onClick={() => {
                      dropdownTippyRef.current.hide();
                      handleChange('tokenPlacement', 'url');
                    }}
                  >
                    URL
                  </div>
                </Dropdown>
              </div>
            </div>
            {
              tokenPlacement === 'header' ?
                <div className="flex flex-col w-full gap-1" key={`input-token-prefix`}>
                  <label className="block font-medium">Token Prefix</label>
                  <div className="single-line-editor-wrapper">
                    <SingleLineEditor
                      value={oAuth['tokenPrefix'] || ''}
                      theme={storedTheme}
                      onSave={handleSave}
                      onChange={(val) => handleChange('tokenPrefix', val)}
                      onRun={handleRun}
                      collection={collection}
                    />
                  </div>
                </div>
                :
                <div className="flex flex-col w-full gap-1" key={`input-token-query-param-key`}>
                  <label className="block font-medium">Token Query Param Key</label>
                  <div className="single-line-editor-wrapper">
                    <SingleLineEditor
                      value={oAuth['tokenQueryParamKey'] || ''}
                      theme={storedTheme}
                      onSave={handleSave}
                      onChange={(val) => handleChange('tokenQueryParamKey', val)}
                      onRun={handleRun}
                      collection={collection}
                    />
                  </div>
                </div>
            }
            <div className="flex flex-row gap-4">
              <button onClick={handleFetchOauth2Credentials} className="submit btn btn-sm btn-secondary w-fit flex flex-row">
                Get Access Token{fetchingToken? <IconLoader2 className="animate-spin ml-2" size={18} strokeWidth={1.5} /> : ""}
              </button>
              <button onClick={handleClearCache} className="submit btn btn-sm btn-secondary w-fit">
                Clear Cache
              </button>
            </div>
          </>
      }
    </StyledWrapper>
  );
};

export default OAuth2AuthorizationCode;
