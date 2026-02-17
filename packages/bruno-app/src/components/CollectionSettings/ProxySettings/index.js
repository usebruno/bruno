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
import Button from 'ui/Button';

const ProxySettings = ({ collection }) => {
  const dispatch = useDispatch();
  const initialProxyConfig = {
    inherit: true,
    config: {
      protocol: 'http',
      hostname: '',
      port: '',
      auth: {
        username: '',
        password: ''
      },
      bypassProxy: ''
    }
  };

  // Get proxy from draft.brunoConfig if it exists, otherwise from brunoConfig
  const currentProxyConfig = collection.draft?.brunoConfig
    ? get(collection, 'draft.brunoConfig.proxy', initialProxyConfig)
    : get(collection, 'brunoConfig.proxy', initialProxyConfig);

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
      proxy: updatedProxy
    }));
  };

  const handleSave = () => dispatch(saveCollectionSettings(collection.uid));

  const handleEnabledChange = (e) => {
    const value = e.target.value;
    // Map UI values to new format
    if (value === 'inherit') {
      updateProxy({ disabled: false, inherit: true });
    } else if (value === 'true') {
      updateProxy({ disabled: false, inherit: false });
    } else {
      updateProxy({ disabled: true, inherit: false });
    }
  };

  const handleProtocolChange = (e) => {
    updateProxy({
      config: {
        ...currentProxyConfig.config,
        protocol: e.target.value
      }
    });
  };

  const handleHostnameChange = (e) => {
    const hostname = e.target.value;
    if (validateHostnameOnChange(hostname)) {
      updateProxy({
        config: {
          ...currentProxyConfig.config,
          hostname
        }
      });
    }
  };

  const handlePortChange = (e) => {
    const port = e.target.value ? Number(e.target.value) : '';
    if (validatePortOnChange(port)) {
      updateProxy({
        config: {
          ...currentProxyConfig.config,
          port
        }
      });
    }
  };

  const handleAuthEnabledChange = (e) => {
    updateProxy({
      config: {
        ...currentProxyConfig.config,
        auth: {
          ...currentProxyConfig.config.auth,
          disabled: !e.target.checked
        }
      }
    });
  };

  const handleAuthUsernameChange = (e) => {
    const username = e.target.value;
    if (validateAuthUsernameOnChange(username)) {
      updateProxy({
        config: {
          ...currentProxyConfig.config,
          auth: {
            ...currentProxyConfig.config.auth,
            username
          }
        }
      });
    }
  };

  const handleAuthPasswordChange = (e) => {
    const password = e.target.value;
    if (validateAuthPasswordOnChange(password)) {
      updateProxy({
        config: {
          ...currentProxyConfig.config,
          auth: {
            ...currentProxyConfig.config.auth,
            password
          }
        }
      });
    }
  };

  const handleBypassProxyChange = (e) => {
    const bypassProxy = e.target.value;
    if (validateBypassProxyOnChange(bypassProxy)) {
      updateProxy({
        config: {
          ...currentProxyConfig.config,
          bypassProxy
        }
      });
    }
  };

  // Map new format to UI values
  const disabled = currentProxyConfig.disabled || false;
  const inherit = currentProxyConfig.inherit !== undefined ? currentProxyConfig.inherit : true;
  const enabledValue = disabled ? 'false' : (inherit ? 'inherit' : 'true');

  return (
    <StyledWrapper className="h-full w-full">
      <div className="text-xs mb-4 text-muted">Configure proxy settings for this collection.</div>
      <div className="bruno-form">
        <div className="mb-3 flex items-center">
          <label className="settings-label flex items-center" htmlFor="enabled">
            Config
            <InfoTip infotipId="request-var">
              <div>
                <ul>
                  <li><span style={{ width: '50px', display: 'inline-block' }}>inherit</span> - inherit from global preferences</li>
                  <li><span style={{ width: '50px', display: 'inline-block' }}>enabled</span> - use collection-specific proxy config</li>
                  <li><span style={{ width: '50px', display: 'inline-block' }}>disabled</span> - disable proxy for this collection</li>
                </ul>
              </div>
            </InfoTip>
          </label>
          <div className="flex items-center">
            <label className="flex items-center">
              <input
                type="radio"
                name="enabled"
                value="inherit"
                checked={enabledValue === 'inherit'}
                onChange={handleEnabledChange}
                className="mr-1"
              />
              inherit
            </label>
            <label className="flex items-center ml-4">
              <input
                type="radio"
                name="enabled"
                value="true"
                checked={enabledValue === 'true'}
                onChange={handleEnabledChange}
                className="mr-1"
              />
              enabled
            </label>
            <label className="flex items-center ml-4">
              <input
                type="radio"
                name="enabled"
                value="false"
                checked={enabledValue === 'false'}
                onChange={handleEnabledChange}
                className="mr-1"
              />
              disabled
            </label>
          </div>
        </div>
        {enabledValue === 'true' && (
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
                    checked={(currentProxyConfig.config?.protocol || 'http') === 'http'}
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
                    checked={(currentProxyConfig.config?.protocol || 'http') === 'https'}
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
                    checked={(currentProxyConfig.config?.protocol || 'http') === 'socks4'}
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
                    checked={(currentProxyConfig.config?.protocol || 'http') === 'socks5'}
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
                value={currentProxyConfig.config?.hostname || ''}
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
                value={currentProxyConfig.config?.port || ''}
              />
            </div>
            <div className="mb-3 flex items-center">
              <label className="settings-label" htmlFor="auth.disabled">
                Auth
              </label>
              <input
                type="checkbox"
                name="auth.disabled"
                checked={!currentProxyConfig.config?.auth?.disabled}
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
                  value={currentProxyConfig.config?.auth?.username || ''}
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
                    value={currentProxyConfig.config?.auth?.password || ''}
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
                value={currentProxyConfig.config?.bypassProxy || ''}
              />
            </div>
          </>
        )}
        <div className="mt-6">
          <Button type="submit" size="sm" onClick={handleSave}>
            Save
          </Button>
        </div>
      </div>
    </StyledWrapper>
  );
};

export default ProxySettings;
