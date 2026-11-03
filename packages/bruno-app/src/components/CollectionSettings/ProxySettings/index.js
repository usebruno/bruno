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
import MenuDropdown from 'ui/MenuDropdown';
import { IconChevronDown } from '@tabler/icons';
import Checkbox from 'ui/Checkbox';
import SettingsField from 'ui/patterns/SettingsField';
import SettingsList from 'ui/patterns/SettingsList';
import { useTheme } from 'providers/Theme';

const PROXY_PROTOCOL_OPTIONS = [
  { value: 'http', label: 'HTTP' },
  { value: 'https', label: 'HTTPS' },
  { value: 'socks4', label: 'SOCKS4' },
  { value: 'socks5', label: 'SOCKS5' }
];

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

  const selectedProtocol = currentProxyConfig.config?.protocol || 'http';

  return (
    <StyledWrapper className="h-full w-full">
      <SettingsList className="proxy-settings bruno-form">
        <div className="text-muted">Configure proxy settings for this collection.</div>

        {/* Lines only between the settings sections, not around the intro or the Save button */}
        <SettingsList dividers>

          <SettingsField
            label={(
              <span className="flex items-center">
                <span id="collection-proxy-mode-label">Proxy mode</span>
                <InfoTip infotipId="collection-proxy-mode-info" style={{ zIndex: 20 }}>
                  <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 m-0">
                    <dt className="font-medium">Inherit</dt>
                    <dd className="m-0">Inherit from global preferences</dd>
                    <dt className="font-medium">Custom</dt>
                    <dd className="m-0">Use collection-specific proxy config</dd>
                    <dt className="font-medium">Off</dt>
                    <dd className="m-0">Disable proxy for this collection</dd>
                  </dl>
                </InfoTip>
              </span>
            )}
          >
            <div className="flex flex-col gap-2">
              <SegmentedControl
                ariaLabelledBy="collection-proxy-mode-label"
                name="enabled"
                value={enabledValue}
                onChange={(_value, e) => handleEnabledChange(e)}
                items={[
                  { value: 'inherit', label: 'Inherit' },
                  { value: 'true', label: 'Custom' },
                  { value: 'false', label: 'Off' }
                ]}
                className="self-start"
                data-testid="collection-proxy-mode"
              />
              {enabledValue === 'inherit' && (
                <div className="hint" data-testid="collection-proxy-inherit-hint">
                  Uses the proxy configured in app preferences.
                </div>
              )}
            </div>
          </SettingsField>

          {enabledValue === 'true' && (
            <>
              <div className="grid grid-cols-[112px_1fr_120px] gap-3">
                <SettingsField label="Protocol" labelId="collection-proxy-protocol-label">
                  <MenuDropdown
                    items={PROXY_PROTOCOL_OPTIONS.map(({ value, label }) => ({
                      id: value,
                      label,
                      onClick: () => handleProtocolChange({ target: { value } })
                    }))}
                    selectedItemId={selectedProtocol}
                    placement="bottom-start"
                    data-testid="collection-proxy-protocol-menu"
                    appendTo={() => document.body}
                    popperOptions={{ strategy: 'fixed' }}
                    sameWidth
                  >
                    <button
                      type="button"
                      id="collection-proxy-protocol-trigger"
                      className="protocol-trigger"
                      aria-labelledby="collection-proxy-protocol-label collection-proxy-protocol-trigger"
                      data-testid="collection-proxy-protocol"
                    >
                      <span>
                        {PROXY_PROTOCOL_OPTIONS.find((option) => option.value === selectedProtocol)?.label ?? selectedProtocol}
                      </span>
                      <IconChevronDown size={14} strokeWidth={2} />
                    </button>
                  </MenuDropdown>
                </SettingsField>
                <SettingsField label="Hostname" labelId="collection-proxy-hostname-label">
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
                </SettingsField>
                <SettingsField label="Port" htmlFor="port">
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
                </SettingsField>
              </div>

              <SettingsList gap="md">
                <SettingsField layout="leading" label="Proxy authentication" htmlFor="auth.disabled">
                  <Checkbox
                    id="auth.disabled"
                    name="auth.disabled"
                    checked={!currentProxyConfig.config?.auth?.disabled}
                    onChange={handleAuthEnabledChange}
                    data-testid="collection-proxy-auth"
                  />
                </SettingsField>
                <div className="grid grid-cols-2 gap-3">
                  <SettingsField label="Username" labelId="collection-proxy-username-label">
                    <div className="single-line-editor-wrapper mono">
                      <SingleLineEditor
                        value={currentProxyConfig.config?.auth?.username || ''}
                        theme={storedTheme}
                        onSave={handleSave}
                        onChange={handleAuthUsernameChange}
                        collection={collection}
                        isCompact
                        data-testid="collection-proxy-username"
                      />
                    </div>
                  </SettingsField>
                  <SettingsField label="Password" labelId="collection-proxy-password-label">
                    <div className="single-line-editor-wrapper mono flex items-center">
                      <SingleLineEditor
                        value={proxyPassword}
                        theme={storedTheme}
                        onSave={handleSave}
                        onChange={handleAuthPasswordChange}
                        collection={collection}
                        isSecret={true}
                        isCompact
                        data-testid="collection-proxy-password"
                      />
                      <SensitiveFieldWarning fieldName="proxy-password" secretName="password" value={proxyPassword} collection={collection} onReplaceValue={handleAuthPasswordChange} />
                    </div>
                  </SettingsField>
                </div>
              </SettingsList>

              <SettingsField
                label="Proxy bypass"
                description="Separate hosts with commas. Wildcards are supported."
                descriptionId="bypassProxy-description"
                htmlFor="bypassProxy"
              >
                <input
                  id="bypassProxy"
                  aria-describedby="bypassProxy-description"
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
              </SettingsField>
            </>
          )}

        </SettingsList>

        <Button type="submit" size="base" className="self-start" onClick={handleSave}>
          Save
        </Button>
      </SettingsList>
    </StyledWrapper>
  );
};

export default ProxySettings;
