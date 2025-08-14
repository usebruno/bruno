import React, { useRef, forwardRef, useMemo } from 'react';
import get from 'lodash/get';
import { useTheme } from 'providers/Theme';
import { useDispatch } from 'react-redux';
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

const OAuth2Implicit = ({ save, item = {}, request, handleRun, updateAuth, collection, folder }) => {
  const dispatch = useDispatch();
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
    autoFetchToken
  } = oAuth;

  const interpolatedAuthUrl = useMemo(() => {
    const variables = getAllVariables(collection, item);
    return interpolate(authorizationUrl, variables);
  }, [collection, item, authorizationUrl]);

  const TokenPlacementIcon = forwardRef((props, ref) => {
    return (
      <div ref={ref} className="flex items-center justify-end token-placement-label select-none">
        {tokenPlacement == 'url' ? 'URL' : 'Headers'}
        <IconCaretDown className="caret ml-1 mr-1" size={14} strokeWidth={2} />
      </div>
    );
  });

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
          [key]: value,
        }
      })
    );
  };

  const handleAutoFetchTokenToggle = (e) => {
    handleChange('autoFetchToken', e.target.checked);
  };

  return (
    <Wrapper className="mt-2 flex w-full gap-4 flex-col">
      <Oauth2TokenViewer handleRun={handleRun} collection={collection} item={item} url={authorizationUrl} credentialsId={credentialsId} />
      <div className="flex items-center gap-2.5 mt-2">
        <div className="flex items-center px-2.5 py-1.5 bg-indigo-50/50 dark:bg-indigo-500/10 rounded-md">
          <IconSettings size={14} className="text-indigo-500 dark:text-indigo-400" />
        </div>
        <span className="text-sm font-medium">
          Configuration
        </span>
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
              />
            </div>
          </div>
        );
      })}

      <div className="flex items-center gap-2.5 mt-2">
        <div className="flex items-center px-2.5 py-1.5 bg-indigo-50/50 dark:bg-indigo-500/10 rounded-md">
          <IconKey size={14} className="text-indigo-500 dark:text-indigo-400" />
        </div>
        <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
          Token
        </span>
      </div>

      <div className="flex items-center gap-4 w-full" key={`input-token-name`}>
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
          />
        </div>
      </div>

      <div className="flex items-center gap-4 w-full" key={`input-token-placement`}>
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
        <div className="flex items-center gap-4 w-full" key={`input-token-header-prefix`}>
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
            />
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-4 w-full" key={`input-token-query-key`}>
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
            />
          </div>
        </div>
      )}

      <div className="flex items-center gap-2.5 mt-2">
        <div className="flex items-center px-2.5 py-1.5 bg-indigo-50/50 dark:bg-indigo-500/10 rounded-md">
          <IconAdjustmentsHorizontal size={14} className="text-indigo-500 dark:text-indigo-400" />
        </div>
        <span className="text-sm font-medium">
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
      />
      <Oauth2ActionButtons item={item} request={request} collection={collection} url={interpolatedAuthUrl} credentialsId={credentialsId} />
    </Wrapper>
  );
};

export default OAuth2Implicit; 