import React from 'react';
import InfoTip from 'components/InfoTip';
import StyledWrapper from './StyledWrapper';
import { IconEye, IconEyeOff } from '@tabler/icons';
import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { updateCollectionProxy } from 'providers/ReduxStore/slices/collections';
import { saveCollectionSettings } from 'providers/ReduxStore/slices/collections/actions';
import { get } from 'lodash';

const ProxySettings = ({ collection }) => {
  const dispatch = useDispatch();

  // Get proxy from draft.brunoConfig if it exists, otherwise from brunoConfig
  const currentProxyConfig = collection.draft?.brunoConfig
    ? get(collection, 'draft.brunoConfig.proxy', {})
    : get(collection, 'brunoConfig.proxy', {});

  const [passwordVisible, setPasswordVisible] = useState(false);

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
    // Convert string to boolean or keep as 'global'
    const enabled = value === 'true' ? true : value === 'false' ? false : 'global';
    updateProxy({ enabled });
  };

  const handleProtocolChange = (e) => {
    updateProxy({ protocol: e.target.value });
  };

  const handleHostnameChange = (e) => {
    updateProxy({ hostname: e.target.value });
  };

  const handlePortChange = (e) => {
    const port = e.target.value ? Number(e.target.value) : '';
    updateProxy({ port });
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
    updateProxy({
      auth: {
        ...currentProxyConfig.auth,
        username: e.target.value
      }
    });
  };

  const handleAuthPasswordChange = (e) => {
    updateProxy({
      auth: {
        ...currentProxyConfig.auth,
        password: e.target.value
      }
    });
  };

  const handleBypassProxyChange = (e) => {
    updateProxy({ bypassProxy: e.target.value });
  };

  const enabledValue = currentProxyConfig.enabled === true ? 'true' : currentProxyConfig.enabled === false ? 'false' : 'global';

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
                  <li><span style={{width: "50px", display: "inline-block"}}>global</span> - use global proxy config</li>
                  <li><span style={{width: "50px", display: "inline-block"}}>enabled</span> - use collection proxy config</li>
                  <li><span style={{width: "50px", display: "inline-block"}}>disable</span> - disable proxy</li>
                </ul>
              </div>
            </InfoTip>
          </label>
          <div className="flex items-center">
            <label className="flex items-center">
              <input
                type="radio"
                name="enabled"
                value="global"
                checked={enabledValue === 'global'}
                onChange={handleEnabledChange}
                className="mr-1"
              />
              global
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