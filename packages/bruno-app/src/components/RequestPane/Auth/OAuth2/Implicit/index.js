import React, { useRef, forwardRef, useMemo } from 'react';
import get from 'lodash/get';
import { useTheme } from 'providers/Theme';
import { useDispatch, useSelector } from 'react-redux';
import { IconCaretDown, IconSettings, IconKey, IconHelp, IconAdjustmentsHorizontal } from '@tabler/icons';
import Dropdown from 'components/Dropdown';
import SingleLineEditor from 'components/SingleLineEditor';
import Wrapper from './StyledWrapper';
import { inputsConfig } from './inputsConfig';
import Oauth2TokenViewer from '../Oauth2TokenViewer/index';
import Oauth2ActionButtons from '../Oauth2ActionButtons/index';
import AdditionalParams from '../AdditionalParams/index';
import { getAllVariables } from 'utils/collections/index';
import { interpolate } from '@usebruno/common';
import { savePreferences } from 'providers/ReduxStore/slices/app';
import toast from 'react-hot-toast';

const OAuth2Implicit = ({ save, item = {}, request, handleRun, updateAuth, collection, folder }) => {
  const dispatch = useDispatch();
  const preferences = useSelector((state) => state.app.preferences);
  const useSystemBrowser = get(preferences, 'request.oauth2.useSystemBrowser', false);
  const { storedTheme } = useTheme();
  const dropdownTippyRef = useRef();
  const onDropdownCreate = (ref) => (dropdownTippyRef.current = ref);

  const oAuth = get(request, 'auth.oauth2', {});
  const {
    callbackUrl,
    authorizationUrl,
    clientId,
    scope,
    state,
    credentialsId,
    tokenPlacement,
    tokenHeaderPrefix,
    tokenQueryKey,
    autoFetchToken,
    tokenSource
  } = oAuth;

  const interpolatedAuthUrl = useMemo(() => {
    const variables = getAllVariables(collection, item);
    return interpolate(authorizationUrl, variables);
  }, [collection, item, authorizationUrl]);

  const TokenSourceIcon = useMemo(() => forwardRef((props, ref) => {
    return (
      <div ref={ref} className="flex items-center justify-end token-placement-label select-none">
        {tokenSource === 'id_token' ? 'ID Token' : 'Access Token'}
        <IconCaretDown className="caret ml-1 mr-1" size={14} strokeWidth={2} />
      </div>
    );
  }), [tokenSource]);

  const TokenPlacementIcon = useMemo(() => forwardRef((props, ref) => {
    return (
      <div ref={ref} className="flex items-center justify-end token-placement-label select-none">
        {tokenPlacement == 'url' ? 'URL' : 'Headers'}
        <IconCaretDown className="caret ml-1 mr-1" size={14} strokeWidth={2} />
      </div>
    );
  }), [tokenPlacement]);

  const handleSave = () => { save(); };

  const handleChange = (key, value) => {
    dispatch(
      updateAuth({
        mode: 'oauth2',
        collectionUid: collection.uid,
        itemUid: item.uid,
        content: {
          grantType: 'implicit',
          callbackUrl,
          authorizationUrl,
          clientId,
          state,
          scope,
          credentialsId,
          tokenPlacement,
          tokenHeaderPrefix,
          tokenQueryKey,
          autoFetchToken,
          tokenSource,
          [key]: value
        }
      })
    );
  };

  const handleAutoFetchTokenToggle = (e) => {
    handleChange('autoFetchToken', e.target.checked);
  };

  const handleUseSystemBrowserToggle = (e) => {
    const newValue = e.target.checked;
    dispatch(
      savePreferences({
        ...preferences,
        request: {
          ...preferences.request,
          oauth2: {
            ...preferences.request.oauth2,
            useSystemBrowser: newValue
          }
        }
      })
    )
      .then(() => {
        toast.success('Preference updated successfully');
      })
      .catch((err) => {
        console.error(err);
        toast.error('Failed to update preference');
      });
  };

  return (
    <Wrapper className="mt-2 flex w-full gap-4 flex-col">
      <Oauth2TokenViewer handleRun={handleRun} collection={collection} item={item} url={authorizationUrl} credentialsId={credentialsId} />
      <div className="flex items-center gap-2.5 mt-2">
        <div className="flex items-center px-2.5 py-1.5 oauth2-icon-container rounded-md">
          <IconSettings size={14} className="oauth2-icon" />
        </div>
        <span className="oauth2-section-label">
          Configuration
        </span>
      </div>
      <div className="flex items-center gap-4 w-full" key="input-callbackUrl">
        <label className="block min-w-[140px]">Callback URL</label>
        <div className="flex flex-col gap-1 w-full">
          <div className="oauth2-input-wrapper flex-1 flex items-center">
            <SingleLineEditor
              value={callbackUrl}
              theme={storedTheme}
              onSave={handleSave}
              onChange={(val) => handleChange('callbackUrl', val)}
              onRun={handleRun}
              collection={collection}
              item={item}
              placeholder={useSystemBrowser ? 'https://oauth.usebruno.com/callback' : undefined}
              isCompact
            />
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4 w-full" key="input-use-system-browser">
        <label className="block min-w-[140px]"></label>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={Boolean(useSystemBrowser)}
            onChange={handleUseSystemBrowserToggle}
            className="cursor-pointer"
          />
          <label
            className="block cursor-pointer"
            onClick={(e) => {
              e.preventDefault();
              handleUseSystemBrowserToggle({ target: { checked: !useSystemBrowser } });
            }}
          >
            Use system browser for OAuth
          </label>
        </div>
      </div>
      {inputsConfig.map((input) => {
        const { key, label, isSecret } = input;
        return (
          <div className="flex items-center gap-4 w-full" key={`input-${key}`}>
            <label className="block min-w-[140px]">{label}</label>
            <div className="oauth2-input-wrapper flex-1">
              <SingleLineEditor
                value={oAuth[key] || ''}
                theme={storedTheme}
                onSave={handleSave}
                onChange={(val) => handleChange(key, val)}
                onRun={handleRun}
                collection={collection}
                item={item}
                isSecret={isSecret}
                isCompact
              />
            </div>
          </div>
        );
      })}

      <div className="flex items-center gap-2.5 mt-2">
        <div className="flex items-center px-2.5 py-1.5 oauth2-icon-container rounded-md">
          <IconKey size={14} className="oauth2-icon" />
        </div>
        <span className="oauth2-section-label">
          Token
        </span>
      </div>

      <div className="flex items-center gap-4 w-full" key="input-token-type">
        <label className="block min-w-[140px]">Token Source</label>
        <div className="inline-flex items-center cursor-pointer token-placement-selector">
          <Dropdown onCreate={onDropdownCreate} icon={<TokenSourceIcon />} placement="bottom-end">
            <div
              className="dropdown-item"
              onClick={() => {
                dropdownTippyRef.current.hide();
                handleChange('tokenSource', 'access_token');
              }}
            >
              Access Token
            </div>
            <div
              className="dropdown-item"
              onClick={() => {
                dropdownTippyRef.current.hide();
                handleChange('tokenSource', 'id_token');
              }}
            >
              ID Token
            </div>
          </Dropdown>
        </div>
      </div>

      <div className="flex items-center gap-4 w-full" key="input-token-name">
        <label className="block min-w-[140px]">Token ID</label>
        <div className="oauth2-input-wrapper flex-1">
          <SingleLineEditor
            value={oAuth['credentialsId'] || 'credentials'}
            theme={storedTheme}
            onSave={handleSave}
            onChange={(val) => handleChange('credentialsId', val)}
            onRun={handleRun}
            collection={collection}
            item={item}
            isCompact
          />
        </div>
      </div>

      <div className="flex items-center gap-4 w-full" key="input-token-placement">
        <label className="block min-w-[140px]">Add Token to</label>
        <div className="inline-flex items-center cursor-pointer token-placement-selector">
          <Dropdown onCreate={onDropdownCreate} icon={<TokenPlacementIcon />} placement="bottom-end">
            <div
              className="dropdown-item"
              onClick={() => {
                dropdownTippyRef.current.hide();
                handleChange('tokenPlacement', 'header');
              }}
            >
              Headers
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

      {tokenPlacement == 'header' ? (
        <div className="flex items-center gap-4 w-full" key="input-token-header-prefix">
          <label className="block min-w-[140px]">Header Prefix</label>
          <div className="oauth2-input-wrapper flex-1">
            <SingleLineEditor
              value={oAuth.tokenHeaderPrefix || 'Bearer'}
              theme={storedTheme}
              onSave={handleSave}
              onChange={(val) => handleChange('tokenHeaderPrefix', val)}
              onRun={handleRun}
              collection={collection}
              item={item}
              isCompact
            />
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-4 w-full" key="input-token-query-key">
          <label className="block min-w-[140px]">URL Query Key</label>
          <div className="oauth2-input-wrapper flex-1">
            <SingleLineEditor
              value={oAuth.tokenQueryKey || 'access_token'}
              theme={storedTheme}
              onSave={handleSave}
              onChange={(val) => handleChange('tokenQueryKey', val)}
              onRun={handleRun}
              collection={collection}
              item={item}
              isCompact
            />
          </div>
        </div>
      )}

      <div className="flex items-center gap-2.5 mt-2">
        <div className="flex items-center px-2.5 py-1.5 oauth2-icon-container rounded-md">
          <IconAdjustmentsHorizontal size={14} className="oauth2-icon" />
        </div>
        <span className="oauth2-section-label">
          Advanced Options
        </span>
      </div>

      <div className="flex items-center gap-4 w-full">
        <input
          type="checkbox"
          checked={oAuth.autoFetchToken !== false}
          onChange={handleAutoFetchTokenToggle}
          className="cursor-pointer ml-1"
        />
        <label className="block min-w-[140px]">Auto fetch token</label>
        <div className="flex items-center gap-2">
          <div className="relative group cursor-pointer">
            <IconHelp size={16} className="text-gray-500" />
            <span className="group-hover:opacity-100 pointer-events-none opacity-0 max-w-60 absolute left-0 bottom-full mb-1 w-max p-2 bg-gray-700 text-white text-xs rounded-md transition-opacity duration-200">
              Automatically fetch a new token when the current one expires.
            </span>
          </div>
        </div>
      </div>

      <AdditionalParams
        item={item}
        request={request}
        collection={collection}
        updateAuth={updateAuth}
        handleSave={handleSave}
      />
      <Oauth2ActionButtons item={item} request={request} collection={collection} url={interpolatedAuthUrl} credentialsId={credentialsId} />
    </Wrapper>
  );
};

export default OAuth2Implicit;
