import React, { useState } from 'react';
import { useDetectSensitiveField } from 'hooks/useDetectSensitiveField';
import get from 'lodash/get';
import toast from 'react-hot-toast';
import { useTheme } from 'providers/Theme';
import { useDispatch, useSelector } from 'react-redux';
import { IconCaretDown, IconSettings, IconKey, IconHelp, IconAdjustmentsHorizontal, IconSearch } from '@tabler/icons';
import MenuDropdown from 'ui/MenuDropdown';
import SingleLineEditor from 'components/SingleLineEditor';
import StyledWrapper from './StyledWrapper';
import { inputsConfig } from './inputsConfig';
import Oauth2TokenViewer from '../Oauth2TokenViewer/index';
import Oauth2ActionButtons from '../Oauth2ActionButtons/index';
import AdditionalParams from '../AdditionalParams/index';
import ClientAuthMethod from '../ClientAuthMethod/index';
import SensitiveFieldWarning from 'components/SensitiveFieldWarning';
import { discoverOidc } from 'providers/ReduxStore/slices/collections/actions';
import { savePreferences } from 'providers/ReduxStore/slices/app';

// Signing algorithms suitable for the JAR Request Object (RFC 9101). FAPI 1/2 require asymmetric
// algorithms; HMAC variants are also allowed for `client_secret_jwt`-style deployments.
const REQUEST_OBJECT_ALGS = [
  'RS256', 'RS384', 'RS512',
  'PS256', 'PS384', 'PS512',
  'ES256', 'ES384', 'ES512',
  'EdDSA',
  'HS256', 'HS384', 'HS512'
];

const PROMPT_OPTIONS = [
  { id: '', label: '(default)' },
  { id: 'none', label: 'none' },
  { id: 'login', label: 'login' },
  { id: 'consent', label: 'consent' },
  { id: 'select_account', label: 'select_account' }
];

const RESPONSE_TYPE_OPTIONS_HYBRID = [
  { id: 'code id_token', label: 'code id_token' },
  { id: 'code id_token token', label: 'code id_token token' }
];

const RESPONSE_MODE_OPTIONS = [
  { id: '', label: '(default)' },
  { id: 'query', label: 'query' },
  { id: 'fragment', label: 'fragment' }
];

// Mirrors cert-utils.js so the "no client certificate" warning agrees with the request runtime.
const hasClientCertForUrl = (brunoConfig, url) => {
  if (!url) return false;
  const certs = brunoConfig?.clientCertificates?.certs;
  if (!Array.isArray(certs) || certs.length === 0) return false;
  return certs.some((cert) => {
    const domain = cert?.domain;
    if (!domain) return false;
    const hostRegex = new RegExp(
      '^(https:\\/\\/|grpc:\\/\\/|grpcs:\\/\\/|ws:\\/\\/|wss:\\/\\/)?'
      + domain.replaceAll('.', '\\.').replaceAll('*', '.*')
    );
    return hostRegex.test(url);
  });
};

const OpenIDConnect = ({ save, item = {}, request, handleRun, updateAuth, collection, grantType }) => {
  const dispatch = useDispatch();
  const preferences = useSelector((state) => state.app.preferences);
  const { storedTheme } = useTheme();
  const useSystemBrowser = get(preferences, 'request.oauth2.useSystemBrowser', false);
  const { isSensitive } = useDetectSensitiveField(collection);
  const oAuth = get(request, 'auth.oauth2', {});
  const isHybrid = grantType === 'openid_hybrid';
  const [discoveryError, setDiscoveryError] = useState('');
  const [discovering, setDiscovering] = useState(false);

  const {
    callbackUrl,
    accessTokenUrl,
    pkce,
    credentialsId,
    tokenPlacement,
    tokenSource,
    refreshTokenUrl,
    autoRefreshToken,
    autoFetchToken,
    issuer,
    nonce,
    prompt,
    loginHint,
    maxAge,
    acrValues,
    useRequestObject,
    requestObjectSigningAlg,
    usePAR,
    parEndpoint,
    responseType,
    responseMode
  } = oAuth;

  const refreshTokenUrlAvailable = refreshTokenUrl?.trim() !== '';
  const isAutoRefreshDisabled = !refreshTokenUrlAvailable;
  const hasSigningKey = Boolean(oAuth?.privateKey || oAuth?.clientSecret);

  const handleSave = () => { save(); };

  const patchOAuth = (patch) => {
    dispatch(
      updateAuth({
        mode: 'oauth2',
        collectionUid: collection.uid,
        itemUid: item.uid,
        content: {
          ...oAuth,
          grantType,
          ...patch
        }
      })
    );
  };

  const handleChange = (key, value) => patchOAuth({ [key]: value });

  const handlePKCEToggle = () => handleChange('pkce', !Boolean(oAuth?.pkce));
  const handleUseRequestObjectToggle = () => handleChange('useRequestObject', !Boolean(useRequestObject));
  const handleUsePARToggle = () => handleChange('usePAR', !Boolean(usePAR));

  const handleUseSystemBrowserToggle = (e) => {
    const newValue = e.target.checked;
    dispatch(
      savePreferences({
        ...preferences,
        request: {
          ...preferences.request,
          oauth2: { ...preferences.request.oauth2, useSystemBrowser: newValue }
        }
      })
    )
      .then(() => toast.success('Preference updated successfully'))
      .catch((err) => {
        console.error(err);
        toast.error('Failed to update preference');
      });
  };

  const handleDiscover = async () => {
    if (!issuer || issuer.trim() === '') {
      setDiscoveryError('Set the Issuer URL first');
      return;
    }
    setDiscoveryError('');
    setDiscovering(true);
    try {
      const metadata = await dispatch(discoverOidc(issuer, collection));
      // Populate the well-known endpoints + supported metadata into the auth state.
      patchOAuth({
        authorizationUrl: metadata.authorization_endpoint || oAuth.authorizationUrl || '',
        accessTokenUrl: metadata.token_endpoint || oAuth.accessTokenUrl || '',
        parEndpoint: metadata.pushed_authorization_request_endpoint || oAuth.parEndpoint || '',
        jwksUri: metadata.jwks_uri || oAuth.jwksUri || '',
        userinfoEndpoint: metadata.userinfo_endpoint || oAuth.userinfoEndpoint || '',
        endSessionEndpoint: metadata.end_session_endpoint || oAuth.endSessionEndpoint || ''
      });
      toast.success('OIDC discovery completed');
    } catch (err) {
      const message = typeof err === 'string' ? err : err?.message || 'OIDC discovery failed';
      setDiscoveryError(message);
      toast.error(message);
    } finally {
      setDiscovering(false);
    }
  };

  return (
    <StyledWrapper className="mt-2 flex w-full gap-4 flex-col">
      <Oauth2TokenViewer handleRun={handleRun} collection={collection} item={item} url={accessTokenUrl} credentialsId={credentialsId} />

      {/* Discovery */}
      <div className="flex items-center gap-2.5 mt-2">
        <div className="flex items-center px-2.5 py-1.5 oauth2-icon-container rounded-md">
          <IconSearch size={14} className="oauth2-icon" />
        </div>
        <span className="oauth2-section-label">Discovery</span>
      </div>
      <div className="flex items-start gap-4 w-full" key="input-issuer">
        <label className="block min-w-[140px] mt-1">Issuer URL</label>
        <div className="flex flex-1 flex-col gap-2">
          <div className="single-line-editor-wrapper flex-1 flex items-center">
            <SingleLineEditor
              value={issuer || ''}
              theme={storedTheme}
              onSave={handleSave}
              onChange={(val) => handleChange('issuer', val)}
              onRun={handleRun}
              collection={collection}
              item={item}
              isCompact
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              className="flex items-center gap-1 oauth2-icon cursor-pointer text-link"
              onClick={handleDiscover}
              disabled={discovering}
              type="button"
              title="Fetch /.well-known/openid-configuration"
            >
              <IconSearch size={14} />
              <span className="text-xs">{discovering ? 'Discovering…' : 'Discover endpoints'}</span>
            </button>
            {discoveryError && (
              <span className="text-xs oauth2-mtls-warning">{discoveryError}</span>
            )}
          </div>
        </div>
      </div>

      {/* Configuration (callback + standard OIDC params) */}
      <div className="flex items-center gap-2.5 mt-2">
        <div className="flex items-center px-2.5 py-1.5 oauth2-icon-container rounded-md">
          <IconSettings size={14} className="oauth2-icon" />
        </div>
        <span className="oauth2-section-label">Configuration</span>
      </div>
      <div className="flex items-center gap-4 w-full" key="input-callbackUrl">
        <label className="block min-w-[140px]">Callback URL</label>
        <div className="single-line-editor-wrapper flex-1 flex items-center">
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
      <div className="flex items-center gap-4 w-full" key="input-use-system-browser">
        <label className="block min-w-[140px]"></label>
        <div className="flex items-center gap-2">
          <input type="checkbox" checked={Boolean(useSystemBrowser)} onChange={handleUseSystemBrowserToggle} className="cursor-pointer" />
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
        const value = oAuth[key] || '';
        const { showWarning, warningMessage } = isSensitive(value);
        return (
          <div className="flex items-center gap-4 w-full" key={`input-${key}`}>
            <label className="block min-w-[140px]">{label}</label>
            <div className="single-line-editor-wrapper flex-1 flex items-center">
              <SingleLineEditor
                value={value}
                theme={storedTheme}
                onSave={handleSave}
                onChange={(val) => handleChange(key, val)}
                onRun={handleRun}
                collection={collection}
                item={item}
                isSecret={isSecret}
                isCompact
              />
              {isSecret && showWarning && <SensitiveFieldWarning fieldName={key} warningMessage={warningMessage} />}
            </div>
          </div>
        );
      })}

      <ClientAuthMethod
        oAuth={oAuth}
        handleChange={handleChange}
        patchOAuth={patchOAuth}
        handleRun={handleRun}
        handleSave={handleSave}
        collection={collection}
        item={item}
      />

      {/* Hybrid-only response_type / response_mode */}
      {isHybrid && (
        <>
          <div className="flex items-center gap-4 w-full" key="input-response-type">
            <label className="block min-w-[140px]">Response Type</label>
            <div className="inline-flex items-center cursor-pointer token-placement-selector">
              <MenuDropdown
                items={RESPONSE_TYPE_OPTIONS_HYBRID.map((opt) => ({
                  id: opt.id, label: opt.label,
                  onClick: () => handleChange('responseType', opt.id)
                }))}
                selectedItemId={responseType || 'code id_token'}
                placement="bottom-end"
              >
                <div className="flex items-center justify-end token-placement-label select-none">
                  {responseType || 'code id_token'}
                  <IconCaretDown className="caret ml-1 mr-1" size={14} strokeWidth={2} />
                </div>
              </MenuDropdown>
            </div>
          </div>
          <div className="flex items-center gap-4 w-full" key="input-response-mode">
            <label className="block min-w-[140px]">Response Mode</label>
            <div className="inline-flex items-center cursor-pointer token-placement-selector">
              <MenuDropdown
                items={RESPONSE_MODE_OPTIONS.map((opt) => ({
                  id: opt.id, label: opt.label,
                  onClick: () => handleChange('responseMode', opt.id)
                }))}
                selectedItemId={responseMode || ''}
                placement="bottom-end"
              >
                <div className="flex items-center justify-end token-placement-label select-none">
                  {responseMode || '(default)'}
                  <IconCaretDown className="caret ml-1 mr-1" size={14} strokeWidth={2} />
                </div>
              </MenuDropdown>
            </div>
          </div>
        </>
      )}

      {/* PKCE */}
      <div className="flex flex-row w-full gap-4" key="pkce">
        <label className="block">Use PKCE</label>
        <input className="cursor-pointer" type="checkbox" checked={Boolean(pkce)} onChange={handlePKCEToggle} />
      </div>

      {/* OIDC Parameters */}
      <div className="flex items-center gap-2.5 mt-2">
        <div className="flex items-center px-2.5 py-1.5 oauth2-icon-container rounded-md">
          <IconAdjustmentsHorizontal size={14} className="oauth2-icon" />
        </div>
        <span className="oauth2-section-label">OpenID Connect Parameters</span>
      </div>
      <div className="flex items-center gap-4 w-full" key="input-nonce">
        <label className="block min-w-[140px]">Nonce</label>
        <div className="single-line-editor-wrapper flex-1">
          <SingleLineEditor
            value={nonce || ''}
            theme={storedTheme}
            onSave={handleSave}
            onChange={(val) => handleChange('nonce', val)}
            onRun={handleRun}
            collection={collection}
            item={item}
            placeholder="Auto-generated if empty"
            isCompact
          />
        </div>
      </div>
      <div className="flex items-center gap-4 w-full" key="input-prompt">
        <label className="block min-w-[140px]">Prompt</label>
        <div className="inline-flex items-center cursor-pointer token-placement-selector">
          <MenuDropdown
            items={PROMPT_OPTIONS.map((opt) => ({
              id: opt.id, label: opt.label,
              onClick: () => handleChange('prompt', opt.id)
            }))}
            selectedItemId={prompt || ''}
            placement="bottom-end"
          >
            <div className="flex items-center justify-end token-placement-label select-none">
              {prompt || '(default)'}
              <IconCaretDown className="caret ml-1 mr-1" size={14} strokeWidth={2} />
            </div>
          </MenuDropdown>
        </div>
      </div>
      <div className="flex items-center gap-4 w-full" key="input-login-hint">
        <label className="block min-w-[140px]">Login Hint</label>
        <div className="single-line-editor-wrapper flex-1">
          <SingleLineEditor
            value={loginHint || ''}
            theme={storedTheme}
            onSave={handleSave}
            onChange={(val) => handleChange('loginHint', val)}
            onRun={handleRun}
            collection={collection}
            item={item}
            isCompact
          />
        </div>
      </div>
      <div className="flex items-center gap-4 w-full" key="input-max-age">
        <label className="block min-w-[140px]">Max Age (s)</label>
        <div className="single-line-editor-wrapper flex-1">
          <SingleLineEditor
            value={maxAge != null ? String(maxAge) : ''}
            theme={storedTheme}
            onSave={handleSave}
            onChange={(val) => {
              const parsed = parseInt(val, 10);
              handleChange('maxAge', Number.isFinite(parsed) && parsed > 0 ? parsed : null);
            }}
            onRun={handleRun}
            collection={collection}
            item={item}
            isCompact
          />
        </div>
      </div>
      <div className="flex items-center gap-4 w-full" key="input-acr-values">
        <label className="block min-w-[140px]">ACR Values</label>
        <div className="single-line-editor-wrapper flex-1">
          <SingleLineEditor
            value={acrValues || ''}
            theme={storedTheme}
            onSave={handleSave}
            onChange={(val) => handleChange('acrValues', val)}
            onRun={handleRun}
            collection={collection}
            item={item}
            isCompact
          />
        </div>
      </div>

      {/* Signed Request Object (JAR — RFC 9101) */}
      <div className="flex items-center gap-2.5 mt-2">
        <div className="flex items-center px-2.5 py-1.5 oauth2-icon-container rounded-md">
          <IconKey size={14} className="oauth2-icon" />
        </div>
        <span className="oauth2-section-label">Signed Request Object (JAR)</span>
      </div>
      <div className="flex flex-row w-full gap-4" key="input-use-request-object">
        <label className="block">Enable</label>
        <input className="cursor-pointer" type="checkbox" checked={Boolean(useRequestObject)} onChange={handleUseRequestObjectToggle} />
      </div>
      {useRequestObject && (
        <>
          <div className="flex items-center gap-4 w-full" key="input-request-object-alg">
            <label className="block min-w-[140px]">Signing Algorithm</label>
            <div className="inline-flex items-center cursor-pointer token-placement-selector">
              <MenuDropdown
                items={REQUEST_OBJECT_ALGS.map((alg) => ({
                  id: alg, label: alg,
                  onClick: () => handleChange('requestObjectSigningAlg', alg)
                }))}
                selectedItemId={requestObjectSigningAlg || 'RS256'}
                placement="bottom-end"
              >
                <div className="flex items-center justify-end token-placement-label select-none">
                  {requestObjectSigningAlg || 'RS256'}
                  <IconCaretDown className="caret ml-1 mr-1" size={14} strokeWidth={2} />
                </div>
              </MenuDropdown>
            </div>
          </div>
          {!hasSigningKey && (
            <div className="flex items-start gap-4 w-full" key="request-object-warning">
              <label className="block min-w-[140px]"></label>
              <div className="flex-1 text-xs oauth2-mtls-warning">
                JAR requires a signing key. Configure a private key (for RS/PS/ES/EdDSA) or a client secret (for HS*) under <strong>Client Authentication</strong>.
              </div>
            </div>
          )}
        </>
      )}

      {/* PAR (RFC 9126) */}
      <div className="flex items-center gap-2.5 mt-2">
        <div className="flex items-center px-2.5 py-1.5 oauth2-icon-container rounded-md">
          <IconKey size={14} className="oauth2-icon" />
        </div>
        <span className="oauth2-section-label">Pushed Authorization Request (PAR)</span>
      </div>
      <div className="flex flex-row w-full gap-4" key="input-use-par">
        <label className="block">Enable</label>
        <input className="cursor-pointer" type="checkbox" checked={Boolean(usePAR)} onChange={handleUsePARToggle} />
      </div>
      {usePAR && (
        <>
          <div className="flex items-center gap-4 w-full" key="input-par-endpoint">
            <label className="block min-w-[140px]">PAR Endpoint</label>
            <div className="single-line-editor-wrapper flex-1">
              <SingleLineEditor
                value={parEndpoint || ''}
                theme={storedTheme}
                onSave={handleSave}
                onChange={(val) => handleChange('parEndpoint', val)}
                onRun={handleRun}
                collection={collection}
                item={item}
                placeholder="Auto-filled by Discovery"
                isCompact
              />
            </div>
          </div>
          {!parEndpoint && (
            <div className="flex items-start gap-4 w-full" key="par-endpoint-warning">
              <label className="block min-w-[140px]"></label>
              <div className="flex-1 text-xs oauth2-mtls-warning">
                PAR is enabled but no PAR endpoint is set. Run Discovery on the Issuer URL, or paste the endpoint manually.
              </div>
            </div>
          )}
        </>
      )}

      {/* Token section */}
      <div className="flex items-center gap-2.5 mt-2">
        <div className="flex items-center px-2.5 py-1.5 oauth2-icon-container rounded-md">
          <IconKey size={14} className="oauth2-icon" />
        </div>
        <span className="oauth2-section-label">Token</span>
      </div>
      <div className="flex items-center gap-4 w-full" key="input-token-type">
        <label className="block min-w-[140px]">Token Source</label>
        <div className="inline-flex items-center cursor-pointer token-placement-selector">
          <MenuDropdown
            items={[
              { id: 'access_token', label: 'Access Token', onClick: () => handleChange('tokenSource', 'access_token') },
              { id: 'id_token', label: 'ID Token', onClick: () => handleChange('tokenSource', 'id_token') }
            ]}
            selectedItemId={tokenSource}
            placement="bottom-end"
          >
            <div className="flex items-center justify-end token-placement-label select-none">
              {tokenSource === 'id_token' ? 'ID Token' : 'Access Token'}
              <IconCaretDown className="caret ml-1 mr-1" size={14} strokeWidth={2} />
            </div>
          </MenuDropdown>
        </div>
      </div>
      <div className="flex items-center gap-4 w-full" key="input-token-name">
        <label className="block min-w-[140px]">Token ID</label>
        <div className="single-line-editor-wrapper flex-1">
          <SingleLineEditor
            value={oAuth['credentialsId'] || ''}
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
        <label className="block min-w-[140px]">Add token to</label>
        <div className="inline-flex items-center cursor-pointer token-placement-selector">
          <MenuDropdown
            items={[
              { id: 'header', label: 'Header', onClick: () => handleChange('tokenPlacement', 'header') },
              { id: 'url', label: 'URL', onClick: () => handleChange('tokenPlacement', 'url') }
            ]}
            selectedItemId={tokenPlacement}
            placement="bottom-end"
          >
            <div className="flex items-center justify-end token-placement-label select-none">
              {tokenPlacement == 'url' ? 'URL' : 'Headers'}
              <IconCaretDown className="caret ml-1 mr-1" size={14} strokeWidth={2} />
            </div>
          </MenuDropdown>
        </div>
      </div>
      {tokenPlacement === 'header' ? (
        <div className="flex items-center gap-4 w-full" key="input-token-prefix">
          <label className="block min-w-[140px]">Header Prefix</label>
          <div className="single-line-editor-wrapper flex-1">
            <SingleLineEditor
              value={oAuth['tokenHeaderPrefix'] || ''}
              theme={storedTheme}
              onSave={handleSave}
              onChange={(val) => handleChange('tokenHeaderPrefix', val)}
              onRun={handleRun}
              collection={collection}
              isCompact
            />
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-4 w-full" key="input-token-query-param-key">
          <label className="block min-w-[140px]">Query Param Key</label>
          <div className="single-line-editor-wrapper flex-1">
            <SingleLineEditor
              value={oAuth['tokenQueryKey'] || ''}
              theme={storedTheme}
              onSave={handleSave}
              onChange={(val) => handleChange('tokenQueryKey', val)}
              onRun={handleRun}
              collection={collection}
              isCompact
            />
          </div>
        </div>
      )}

      {/* Advanced */}
      <div className="flex items-center gap-2.5 mt-4 mb-2">
        <div className="flex items-center px-2.5 py-1.5 oauth2-icon-container rounded-md">
          <IconAdjustmentsHorizontal size={14} className="oauth2-icon" />
        </div>
        <span className="oauth2-section-label">Advanced Settings</span>
      </div>
      <div className="flex items-center gap-4 w-full mb-4">
        <label className="block min-w-[140px]">Refresh Token URL</label>
        <div className="single-line-editor-wrapper flex-1">
          <SingleLineEditor
            value={get(request, 'auth.oauth2.refreshTokenUrl', '')}
            theme={storedTheme}
            onSave={handleSave}
            onChange={(val) => handleChange('refreshTokenUrl', val)}
            collection={collection}
            item={item}
            isCompact
          />
        </div>
      </div>

      {/* Settings */}
      <div className="flex items-center gap-2.5 mt-4">
        <div className="flex items-center px-2.5 py-1.5 oauth2-icon-container rounded-md">
          <IconSettings size={14} className="oauth2-icon" />
        </div>
        <span className="oauth2-section-label">Settings</span>
      </div>
      <div className="flex items-center gap-4 w-full">
        <input type="checkbox" checked={Boolean(autoFetchToken)} onChange={(e) => handleChange('autoFetchToken', e.target.checked)} className="cursor-pointer ml-1" />
        <label className="block min-w-[140px]">Automatically fetch token if not found</label>
        <div className="flex items-center gap-2">
          <div className="relative group cursor-pointer">
            <IconHelp size={16} className="text-gray-500" />
            <span className="group-hover:opacity-100 pointer-events-none opacity-0 max-w-60 absolute left-0 bottom-full mb-1 w-max p-2 bg-gray-700 text-white text-xs rounded-md transition-opacity duration-200">
              Automatically fetch a new token when you try to access a resource and don't have one.
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4 w-full">
        <input
          type="checkbox"
          checked={Boolean(autoRefreshToken)}
          onChange={(e) => handleChange('autoRefreshToken', e.target.checked)}
          className={`cursor-pointer ml-1 ${isAutoRefreshDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          disabled={isAutoRefreshDisabled}
        />
        <label className={`block min-w-[140px] ${isAutoRefreshDisabled ? 'text-gray-500' : ''}`}>Auto refresh token (with refresh URL)</label>
      </div>

      <AdditionalParams item={item} request={request} collection={collection} updateAuth={updateAuth} handleSave={handleSave} />
      <Oauth2ActionButtons item={item} request={request} collection={collection} url={accessTokenUrl} credentialsId={credentialsId} />
    </StyledWrapper>
  );
};

export default OpenIDConnect;
