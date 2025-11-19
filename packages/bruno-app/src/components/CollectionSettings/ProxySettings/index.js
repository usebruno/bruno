import React from 'react';
import InfoTip from 'components/InfoTip';
import StyledWrapper from './StyledWrapper';
import { IconEye, IconEyeOff } from '@tabler/icons';
import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { updateCollectionProxy } from 'providers/ReduxStore/slices/collections';
import { saveCollectionSettings } from 'providers/ReduxStore/slices/collections/actions';
import { get } from 'lodash';
import toast from 'react-hot-toast';
import { getProxyMode, transformProxyForStorage } from './helpers';

// Helper to normalize proxy config to object format for form display
const normalizeProxyConfig = (proxyConfig) => {
  // If it's false, 'inherit', or not an object, return default object structure
  if (proxyConfig === false || proxyConfig === 'inherit' || typeof proxyConfig !== 'object' || proxyConfig === null) {
    return {
      mode: getProxyMode(proxyConfig),
      protocol: 'http',
      hostname: '',
      port: '',
      auth: { enabled: false, username: '', password: '' },
      bypassProxy: ''
    };
  }

  // If it's an object, merge with defaults and add mode
  return {
    mode: 'on',
    protocol: proxyConfig.protocol || 'http',
    hostname: proxyConfig.hostname || '',
    port: proxyConfig.port || '',
    auth: {
      enabled: proxyConfig.auth?.enabled || false,
      username: proxyConfig.auth?.username || '',
      password: proxyConfig.auth?.password || ''
    },
    bypassProxy: proxyConfig.bypassProxy || ''
  };
};

const ProxySettings = ({ collection }) => {
  const dispatch = useDispatch();
  const defaultProxyValue = 'inherit';

  // Get proxy from draft.brunoConfig if it exists, otherwise from brunoConfig
  const proxyConfig = collection.draft?.brunoConfig
    ? get(collection, 'draft.brunoConfig.proxy', defaultProxyValue)
    : get(collection, 'brunoConfig.proxy', defaultProxyValue);

  // Normalize to object format for form display
  const currentProxyConfig = normalizeProxyConfig(proxyConfig);

  const [passwordVisible, setPasswordVisible] = useState(false);

  const validateHostnameOnChange = (hostname) => {
    if (hostname && hostname.length > 1024) {
      toast.error('Hostname must be less than 1024 characters');
      return false;
    }
    return true;
  };

  const validatePortOnChange = (port) => {
    if (!port || port === '') {
      return true; // Allow empty port during typing
    }
    const portNum = Number(port);
    if (isNaN(portNum)) {
      toast.error('Port must be a valid number');
      return false;
    }
    if (portNum < 1 || portNum > 65535) {
      toast.error('Port must be between 1 and 65535');
      return false;
    }
    return true;
  };

  const validateAuthUsernameOnChange = (username) => {
    if (username && username.length > 1024) {
      toast.error('Username must be less than 1024 characters');
      return false;
    }
    return true;
  };

  const validateAuthPasswordOnChange = (password) => {
    if (password && password.length > 1024) {
      toast.error('Password must be less than 1024 characters');
      return false;
    }
    return true;
  };

  const validateBypassProxyOnChange = (bypassProxy) => {
    if (bypassProxy && bypassProxy.length > 1024) {
      toast.error('Bypass proxy must be less than 1024 characters');
      return false;
    }
    return true;
  };

  // Helper to update proxy config
  const updateProxy = (updates) => {
    const updatedProxy = { ...currentProxyConfig, ...updates };
    dispatch(updateCollectionProxy({
      collectionUid: collection.uid,
      proxy: transformProxyForStorage(updatedProxy)
    }));
  };

  const handleSave = () => dispatch(saveCollectionSettings(collection.uid));

  const handleModeChange = (e) => {
    updateProxy({ mode: e.target.value });
  };

  const handleProtocolChange = (e) => {
    updateProxy({ protocol: e.target.value });
  };

  const handleHostnameChange = (e) => {
    const hostname = e.target.value;
    if (validateHostnameOnChange(hostname)) {
      updateProxy({ hostname });
    }
  };

  const handlePortChange = (e) => {
    const port = e.target.value ? Number(e.target.value) : '';
    if (validatePortOnChange(port)) {
      updateProxy({ port });
    }
  };

  const handleAuthEnabledChange = (e) => {
    updateProxy({
      auth: {
        ...currentProxyConfig.auth,
        enabled: e.target.checked
      }
    });
  };

  const handleAuthUsernameChange = (e) => {
    const username = e.target.value;
    if (validateAuthUsernameOnChange(username)) {
      updateProxy({
        auth: {
          ...currentProxyConfig.auth,
          username
        }
      });
    }
  };

  const handleAuthPasswordChange = (e) => {
    const password = e.target.value;
    if (validateAuthPasswordOnChange(password)) {
      updateProxy({
        auth: {
          ...currentProxyConfig.auth,
          password
        }
      });
    }
  };

  const handleBypassProxyChange = (e) => {
    const bypassProxy = e.target.value;
    if (validateBypassProxyOnChange(bypassProxy)) {
      updateProxy({ bypassProxy });
    }
  };

  const proxyMode = currentProxyConfig.mode;

  return (
    <StyledWrapper className="h-full w-full">
      <div className="text-xs mb-4 text-muted">Configure proxy settings for this collection.</div>
      <div className="bruno-form">
        <div className="mb-3 flex items-center">
          <label className="settings-label flex items-center" htmlFor="mode">
            Config
            <InfoTip infotipId="request-var">
              <div>
                <ul>
                  <li>
                    <span style={{ width: '50px', display: 'inline-block' }}>inherit</span>
                    {' '}
                    - use global proxy config
                  </li>
                  <li>
                    <span style={{ width: '50px', display: 'inline-block' }}>on</span>
                    {' '}
                    - use collection proxy config
                  </li>
                  <li>
                    <span style={{ width: '50px', display: 'inline-block' }}>off</span>
                    {' '}
                    - disable proxy
                  </li>
                </ul>
              </div>
            </InfoTip>
          </label>
          <div className="flex items-center">
            <label className="flex items-center">
              <input
                type="radio"
                name="mode"
                value="inherit"
                checked={proxyMode === 'inherit'}
                onChange={handleModeChange}
                className="mr-1"
              />
              Inherit
            </label>
            <label className="flex items-center ml-4">
              <input
                type="radio"
                name="mode"
                value="on"
                checked={proxyMode === 'on'}
                onChange={handleModeChange}
                className="mr-1"
              />
              On
            </label>
            <label className="flex items-center ml-4">
              <input
                type="radio"
                name="mode"
                value="off"
                checked={proxyMode === 'off'}
                onChange={handleModeChange}
                className="mr-1"
              />
              Off
            </label>
          </div>
        </div>
        {proxyMode === 'on' ? (
          <>
            <div className="mb-3 flex items-center">
              <label className="settings-label" htmlFor="protocol">
                Protocol
              </label>
              <div className="flex items-center">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="protocol"
                    value="http"
                    checked={(currentProxyConfig.protocol || 'http') === 'http'}
                    onChange={handleProtocolChange}
                    className="mr-1"
                  />
                  HTTP
                </label>
                <label className="flex items-center ml-4">
                  <input
                    type="radio"
                    name="protocol"
                    value="https"
                    checked={(currentProxyConfig.protocol || 'http') === 'https'}
                    onChange={handleProtocolChange}
                    className="mr-1"
                  />
                  HTTPS
                </label>
                <label className="flex items-center ml-4">
                  <input
                    type="radio"
                    name="protocol"
                    value="socks4"
                    checked={(currentProxyConfig.protocol || 'http') === 'socks4'}
                    onChange={handleProtocolChange}
                    className="mr-1"
                  />
                  SOCKS4
                </label>
                <label className="flex items-center ml-4">
                  <input
                    type="radio"
                    name="protocol"
                    value="socks5"
                    checked={(currentProxyConfig.protocol || 'http') === 'socks5'}
                    onChange={handleProtocolChange}
                    className="mr-1"
                  />
                  SOCKS5
                </label>
              </div>
            </div>
            <div className="mb-3 flex items-center">
              <label className="settings-label" htmlFor="hostname">
                Hostname
              </label>
              <input
                id="hostname"
                type="text"
                name="hostname"
                className="block textbox"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                onChange={handleHostnameChange}
                value={currentProxyConfig.hostname || ''}
              />
            </div>
            <div className="mb-3 flex items-center">
              <label className="settings-label" htmlFor="port">
                Port
              </label>
              <input
                id="port"
                type="number"
                name="port"
                className="block textbox"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                onChange={handlePortChange}
                value={currentProxyConfig.port || ''}
              />
            </div>
            <div className="mb-3 flex items-center">
              <label className="settings-label" htmlFor="auth.enabled">
                Auth
              </label>
              <input
                type="checkbox"
                name="auth.enabled"
                checked={currentProxyConfig.auth?.enabled || false}
                onChange={handleAuthEnabledChange}
              />
            </div>
            <div>
              <div className="mb-3 flex items-center">
                <label className="settings-label" htmlFor="auth.username">
                  Username
                </label>
                <input
                  id="auth.username"
                  type="text"
                  name="auth.username"
                  className="block textbox"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                  value={currentProxyConfig.auth?.username || ''}
                  onChange={handleAuthUsernameChange}
                />
              </div>
              <div className="mb-3 flex items-center">
                <label className="settings-label" htmlFor="auth.password">
                  Password
                </label>
                <div className="textbox flex flex-row items-center w-[13.2rem] h-[1.70rem] relative">
                  <input
                    id="auth.password"
                    type={passwordVisible ? 'text' : 'password'}
                    name="auth.password"
                    className="outline-none bg-transparent w-[10.5rem]"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck="false"
                    value={currentProxyConfig.auth?.password || ''}
                    onChange={handleAuthPasswordChange}
                  />
                  <button
                    type="button"
                    className="btn btn-sm absolute right-0"
                    onClick={() => setPasswordVisible(!passwordVisible)}
                  >
                    {passwordVisible ? <IconEyeOff size={18} strokeWidth={1.5} /> : <IconEye size={18} strokeWidth={1.5} />}
                  </button>
                </div>
              </div>
            </div>
            <div className="mb-3 flex items-center">
              <label className="settings-label" htmlFor="bypassProxy">
                Proxy Bypass
              </label>
              <input
                id="bypassProxy"
                type="text"
                name="bypassProxy"
                className="block textbox"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                onChange={handleBypassProxyChange}
                value={currentProxyConfig.bypassProxy || ''}
              />
            </div>
          </>
        ) : null}
        <div className="mt-6">
          <button type="submit" className="submit btn btn-sm btn-secondary" onClick={handleSave}>
            Save
          </button>
        </div>
      </div>
    </StyledWrapper>
  );
};

export default ProxySettings;