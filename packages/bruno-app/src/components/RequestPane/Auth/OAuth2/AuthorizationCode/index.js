import React, { useRef, forwardRef, useState } from 'react';
import { useDetectSensitiveField } from 'hooks/useDetectSensitiveField';
import get from 'lodash/get';
import { useTheme } from 'providers/Theme';
import { useDispatch } from 'react-redux';
import {
  IconCaretDown,
  IconSettings,
  IconKey,
  IconHelp,
  IconAdjustmentsHorizontal,
  IconLock,
  IconChevronRight
} from '@tabler/icons';
import Dropdown from 'components/Dropdown';
import SingleLineEditor from 'components/SingleLineEditor';
import StyledWrapper from './StyledWrapper';
import { inputsConfig } from './inputsConfig';
import Oauth2TokenViewer from '../Oauth2TokenViewer/index';
import Oauth2ActionButtons from '../Oauth2ActionButtons/index';
import AdditionalParams from '../AdditionalParams/index';
import SensitiveFieldWarning from 'components/SensitiveFieldWarning';

const OAuth2AuthorizationCode = ({ save, item = {}, request, handleRun, updateAuth, collection, folder }) => {
  const dispatch = useDispatch();
  const { storedTheme } = useTheme();
  const dropdownTippyRef = useRef();
  const onDropdownCreate = (ref) => (dropdownTippyRef.current = ref);
  const { isSensitive } = useDetectSensitiveField(collection);
  const oAuth = get(request, 'auth.oauth2', {});

  const [advancedExpanded, setAdvancedExpanded] = useState(false);

  const {
    callbackUrl,
    authorizationUrl,
    accessTokenUrl,
    clientId,
    clientSecret,
    scope,
    credentialsPlacement,
    state,
    pkce,
    credentialsId,
    tokenPlacement,
    tokenHeaderPrefix,
    tokenQueryKey,
    refreshTokenUrl,
    autoRefreshToken,
    autoFetchToken,
    additionalParameters
  } = oAuth;

  const refreshTokenUrlAvailable = refreshTokenUrl?.trim() !== '';
  const isAutoRefreshDisabled = !refreshTokenUrlAvailable;

  const TokenPlacementIcon = forwardRef((props, ref) => {
    return (
      <div ref={ref} className="select-button">
        <span className="select-label">{tokenPlacement == 'url' ? 'URL' : 'Headers'}</span>
        <IconCaretDown className="caret" size={14} strokeWidth={2} />
      </div>
    );
  });

  const CredentialsPlacementIcon = forwardRef((props, ref) => {
    return (
      <div ref={ref} className="select-button">
        <span className="select-label">
          {credentialsPlacement == 'body' ? 'Request Body' : 'Basic Auth Header'}
        </span>
        <IconCaretDown className="caret" size={14} strokeWidth={2} />
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
          grantType: 'authorization_code',
          callbackUrl,
          authorizationUrl,
          accessTokenUrl,
          clientId,
          clientSecret,
          state,
          scope,
          pkce,
          credentialsPlacement,
          credentialsId,
          tokenPlacement,
          tokenHeaderPrefix,
          tokenQueryKey,
          refreshTokenUrl,
          autoRefreshToken,
          autoFetchToken,
          additionalParameters,
          [key]: value,
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
          credentialsPlacement,
          credentialsId,
          tokenPlacement,
          tokenHeaderPrefix,
          tokenQueryKey,
          autoFetchToken,
          additionalParameters,
          pkce: !Boolean(oAuth?.['pkce'])
        }
      })
    );
  };

  return (
    <StyledWrapper className="mt-2 w-full">
      {/* Token Viewer */}
      <Oauth2TokenViewer
        handleRun={handleRun}
        collection={collection}
        item={item}
        url={accessTokenUrl}
        credentialsId={credentialsId}
      />

      {/* Configuration Section */}
      <div className="oauth-section">
        <div className="section-header">
          <div className="section-icon">
            <IconSettings size={16} strokeWidth={2} />
          </div>
          <h3 className="section-title">Configuration</h3>
        </div>

        {inputsConfig.map((input) => {
          const { key, label, isSecret } = input;
          const value = oAuth[key] || '';
          const { showWarning, warningMessage } = isSensitive(value);

          return (
            <div className="form-field" key={`input-${key}`}>
              <label className="form-label" htmlFor={`oauth-${key}`}>{label}</label>
              <div className="input-wrapper">
                <div className="single-line-editor-wrapper">
                  <SingleLineEditor
                    id={`oauth-${key}`}
                    value={value}
                    theme={storedTheme}
                    onSave={handleSave}
                    onChange={(val) => handleChange(key, val)}
                    onRun={handleRun}
                    collection={collection}
                    item={item}
                    isSecret={isSecret}
                  />
                </div>
                {isSecret && showWarning && (
                  <SensitiveFieldWarning fieldName={key} warningMessage={warningMessage} />
                )}
              </div>
            </div>
          );
        })}

        <div className="form-field">
          <label className="form-label" htmlFor="oauth-credentials-placement">
            Add Credentials to
          </label>
          <div className="select-wrapper">
            <Dropdown onCreate={onDropdownCreate} icon={<CredentialsPlacementIcon />} placement="bottom-end">
              <div
                className="dropdown-item"
                onClick={() => {
                  dropdownTippyRef.current.hide();
                  handleChange('credentialsPlacement', 'body');
                }}
              >
                Request Body
              </div>
              <div
                className="dropdown-item"
                onClick={() => {
                  dropdownTippyRef.current.hide();
                  handleChange('credentialsPlacement', 'basic_auth_header');
                }}
              >
                Basic Auth Header
              </div>
            </Dropdown>
          </div>
        </div>

        <div className="checkbox-field">
          <input
            id="oauth-pkce"
            type="checkbox"
            checked={Boolean(oAuth?.['pkce'])}
            onChange={handlePKCEToggle}
          />
          <label className="checkbox-label" htmlFor="oauth-pkce">
            Use PKCE (Proof Key for Code Exchange)
          </label>
        </div>
      </div>

      {/* Token Section */}
      <div className="oauth-section">
        <div className="section-header">
          <div className="section-icon">
            <IconKey size={16} strokeWidth={2} />
          </div>
          <h3 className="section-title">Token</h3>
        </div>

        <div className="form-field">
          <label className="form-label" htmlFor="oauth-credentials-id">
            Token ID
          </label>
          <div className="help-text">
            A unique identifier for this token in your collection
          </div>
          <div className="single-line-editor-wrapper">
            <SingleLineEditor
              id="oauth-credentials-id"
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

        <div className="form-field">
          <label className="form-label" htmlFor="oauth-token-placement">
            Add token to
          </label>
          <div className="select-wrapper">
            <Dropdown onCreate={onDropdownCreate} icon={<TokenPlacementIcon />} placement="bottom-end">
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

        {tokenPlacement === 'header' ? (
          <div className="form-field">
            <label className="form-label" htmlFor="oauth-token-prefix">
              Header Prefix
            </label>
            <div className="help-text">
              The prefix to use before the token (e.g., "Bearer")
            </div>
            <div className="single-line-editor-wrapper">
              <SingleLineEditor
                id="oauth-token-prefix"
                value={oAuth['tokenHeaderPrefix'] || ''}
                theme={storedTheme}
                onSave={handleSave}
                onChange={(val) => handleChange('tokenHeaderPrefix', val)}
                onRun={handleRun}
                collection={collection}
              />
            </div>
          </div>
        ) : (
          <div className="form-field">
            <label className="form-label" htmlFor="oauth-token-query-key">
              Query Param Key
            </label>
            <div className="help-text">
              The query parameter name to use for the token
            </div>
            <div className="single-line-editor-wrapper">
              <SingleLineEditor
                id="oauth-token-query-key"
                value={oAuth['tokenQueryKey'] || ''}
                theme={storedTheme}
                onSave={handleSave}
                onChange={(val) => handleChange('tokenQueryKey', val)}
                onRun={handleRun}
                collection={collection}
              />
            </div>
          </div>
        )}
      </div>

      {/* Advanced Settings - Collapsible */}
      <div className="oauth-section">
        <div
          className={`collapsible-header ${advancedExpanded ? 'expanded' : ''}`}
          onClick={() => setAdvancedExpanded(!advancedExpanded)}
        >
          <IconChevronRight size={16} strokeWidth={2} />
          <div className="section-icon">
            <IconAdjustmentsHorizontal size={16} strokeWidth={2} />
          </div>
          <h3 className="section-title">Advanced Settings</h3>
        </div>

        {advancedExpanded && (
          <div className="collapsible-content">
            <div className="form-field">
              <label className="form-label" htmlFor="oauth-refresh-url">
                Refresh Token URL
              </label>
              <div className="help-text">
                The URL to use for refreshing expired tokens
              </div>
              <div className="single-line-editor-wrapper">
                <SingleLineEditor
                  id="oauth-refresh-url"
                  value={get(request, 'auth.oauth2.refreshTokenUrl', '')}
                  theme={storedTheme}
                  onSave={handleSave}
                  onChange={(val) => handleChange('refreshTokenUrl', val)}
                  collection={collection}
                  item={item}
                />
              </div>
            </div>

            <div className="checkbox-field">
              <input
                id="oauth-auto-fetch"
                type="checkbox"
                checked={Boolean(autoFetchToken)}
                onChange={(e) => handleChange('autoFetchToken', e.target.checked)}
              />
              <label className="checkbox-label" htmlFor="oauth-auto-fetch">
                Automatically fetch token if not found
                <div className="help-text" style={{ marginTop: '0.25rem' }}>
                  Automatically fetch a new token when you try to access a resource and don't have one
                </div>
              </label>
            </div>

            <div className="checkbox-field">
              <input
                id="oauth-auto-refresh"
                type="checkbox"
                checked={Boolean(autoRefreshToken)}
                onChange={(e) => handleChange('autoRefreshToken', e.target.checked)}
                disabled={isAutoRefreshDisabled}
              />
              <label
                className={`checkbox-label ${isAutoRefreshDisabled ? 'disabled' : ''}`}
                htmlFor="oauth-auto-refresh"
              >
                Auto refresh token (with refresh URL)
                <div className="help-text" style={{ marginTop: '0.25rem' }}>
                  {isAutoRefreshDisabled
                    ? 'Please provide a Refresh Token URL to enable this feature'
                    : 'Automatically refresh your token using the refresh URL when it expires'}
                </div>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Additional Parameters */}
      <AdditionalParams
        item={item}
        request={request}
        collection={collection}
        updateAuth={updateAuth}
        handleSave={handleSave}
      />

      {/* Action Buttons */}
      <Oauth2ActionButtons
        item={item}
        request={request}
        collection={collection}
        url={accessTokenUrl}
        credentialsId={credentialsId}
      />
    </StyledWrapper>
  );
};

export default OAuth2AuthorizationCode;
