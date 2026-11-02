import React from 'react';
import InfoTip from 'components/InfoTip';
import SensitiveFieldWarning from 'components/SensitiveFieldWarning';
import SingleLineEditor from 'components/SingleLineEditor';
import StyledWrapper from './StyledWrapper';
import { useDispatch } from 'react-redux';
import { updateCollectionProxy } from 'providers/ReduxStore/slices/collections';
import { saveCollectionSettings } from 'providers/ReduxStore/slices/collections/actions';
import { get } from 'lodash';
import toast from 'react-hot-toast';
import Button from 'ui/Button';
import SegmentedControl from 'ui/SegmentedControl';
import Select from 'ui/Select';
import Checkbox from 'ui/Checkbox';
import { useTheme } from 'providers/Theme';

const ProxySettings = ({ collection }) => {
  const dispatch = useDispatch();
  const { storedTheme } = useTheme();
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

  const proxyPassword = currentProxyConfig.config?.auth?.password || '';

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

  const handleHostnameChange = (hostname) => {
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

  const handleAuthUsernameChange = (username) => {
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

  const handleAuthPasswordChange = (password) => {
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

  const isProxyAuthDisabled = Boolean(currentProxyConfig.config?.auth?.disabled);

  return (
    <StyledWrapper className="h-full w-full">
      <div className="proxy-settings bruno-form flex flex-col gap-4">
        <div className="text-muted">Configure proxy settings for this collection.</div>

        <div className="field-group flex flex-col gap-2">
          <label className="settings-label flex items-center" htmlFor="enabled">
            Proxy mode
            <InfoTip infotipId="request-var" style={{ zIndex: 20 }}>
              <dl className="proxy-mode-tip grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 m-0">
                <dt className="font-medium">Inherit</dt>
                <dd className="m-0">Inherit from global preferences</dd>
                <dt className="font-medium">Custom</dt>
                <dd className="m-0">Use collection-specific proxy config</dd>
                <dt className="font-medium">Off</dt>
                <dd className="m-0">Disable proxy for this collection</dd>
              </dl>
            </InfoTip>
          </label>
          <SegmentedControl
            ariaLabel="Proxy mode"
            name="enabled"
            value={enabledValue}
            onChange={(_value, e) => handleEnabledChange(e)}
            items={[
              { value: 'inherit', label: 'Inherit' },
              { value: 'true', label: 'Custom' },
              { value: 'false', label: 'Off' }
            ]}
            size="md"
            className="self-start"
            data-testid="collection-proxy-mode"
          />
          {enabledValue === 'inherit' && (
            <div className="hint" data-testid="collection-proxy-inherit-hint">
              Uses the proxy configured in app preferences.
            </div>
          )}
        </div>

        {enabledValue === 'true' && (
          <>
            <div className="flex flex-col gap-4">
              <div className="field-group flex flex-col gap-2">
                <label className="settings-label" htmlFor="protocol">
                  Protocol
                </label>
                <div className="protocol-select">
                  <Select
                    value={currentProxyConfig.config?.protocol || 'http'}
                    onChange={(value) => handleProtocolChange({ target: { value } })}
                    data={[
                      { value: 'http', label: 'HTTP' },
                      { value: 'https', label: 'HTTPS' },
                      { value: 'socks4', label: 'SOCKS4' },
                      { value: 'socks5', label: 'SOCKS5' }
                    ]}
                    allowDeselect={false}
                    data-testid="collection-proxy-protocol"
                  />
                </div>
              </div>

              <div className="grid grid-cols-[1fr_120px] gap-3">
                <div className="flex flex-col gap-2 min-w-0">
                  <label className="settings-label">
                    Hostname
                  </label>
                  <div className="single-line-editor-wrapper">
                    <SingleLineEditor
                      value={currentProxyConfig.config?.hostname || ''}
                      theme={storedTheme}
                      onSave={handleSave}
                      onChange={handleHostnameChange}
                      collection={collection}
                      isCompact
                      data-testid="collection-proxy-hostname"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-2 min-w-0">
                  <label className="settings-label" htmlFor="port">
                    Port
                  </label>
                  <input
                    id="port"
                    data-testid="collection-proxy-port"
                    type="number"
                    name="port"
                    className="textbox"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck="false"
                    onChange={handlePortChange}
                    value={currentProxyConfig.config?.port || ''}
                  />
                </div>
              </div>
            </div>

            <div className="field-group flex flex-col gap-3">
              <Checkbox
                id="auth.disabled"
                name="auth.disabled"
                checked={!currentProxyConfig.config?.auth?.disabled}
                onChange={handleAuthEnabledChange}
                label={<span className="settings-label">Proxy authentication</span>}
                data-testid="collection-proxy-auth"
              />
              <div className={`credentials flex flex-col gap-3 ${isProxyAuthDisabled ? 'disabled' : ''}`} aria-disabled={isProxyAuthDisabled}>
                <div className="flex flex-col gap-2 min-w-0">
                  <label className="sub-label">
                    Username
                  </label>
                  <div className="single-line-editor-wrapper mono">
                    <SingleLineEditor
                      value={currentProxyConfig.config?.auth?.username || ''}
                      theme={storedTheme}
                      onSave={handleSave}
                      onChange={handleAuthUsernameChange}
                      collection={collection}
                      readOnly={isProxyAuthDisabled}
                      isCompact
                      data-testid="collection-proxy-username"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-2 min-w-0">
                  <label className="sub-label">
                    Password
                  </label>
                  <div className="single-line-editor-wrapper password-wrapper mono flex items-center">
                    <SingleLineEditor
                      value={proxyPassword}
                      theme={storedTheme}
                      onSave={handleSave}
                      onChange={handleAuthPasswordChange}
                      collection={collection}
                      readOnly={isProxyAuthDisabled}
                      isSecret={true}
                      isCompact
                      data-testid="collection-proxy-password"
                    />
                    <SensitiveFieldWarning fieldName="proxy-password" secretName="password" value={proxyPassword} collection={collection} onReplaceValue={handleAuthPasswordChange} />
                  </div>
                </div>
              </div>
            </div>

            <div className="field-group flex flex-col gap-2">
              <label className="settings-label" htmlFor="bypassProxy">
                Proxy Bypass
              </label>
              <input
                id="bypassProxy"
                type="text"
                name="bypassProxy"
                className="textbox mono"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                onChange={handleBypassProxyChange}
                value={currentProxyConfig.config?.bypassProxy || ''}
              />
              <div className="hint -mt-0.5">Separate hosts with commas. Wildcards are supported.</div>
            </div>
          </>
        )}

        <div className="flex items-center gap-2">
          <Button type="submit" size="sm" className="save-button" onClick={handleSave}>
            Save
          </Button>
        </div>
      </div>
    </StyledWrapper>
  );
};

export default ProxySettings;
