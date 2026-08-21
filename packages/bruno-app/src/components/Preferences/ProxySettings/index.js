import React, { useEffect, useCallback, useRef, useState } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import debounce from 'lodash/debounce';
import toast from 'react-hot-toast';
import { savePreferences, refreshPacCache } from 'providers/ReduxStore/slices/app';

import StyledWrapper from './StyledWrapper';
import { useDispatch, useSelector } from 'react-redux';
import { IconEye, IconEyeOff, IconRefresh } from '@tabler/icons';

import SystemProxy from './SystemProxy';
import SegmentedControl from 'ui/SegmentedControl';
import { SettingsGroup, CheckboxSetting, SettingsField } from '../SettingsLayout';

const PROXY_MODES = [
  { 'value': 'off', 'label': 'Off', 'data-testid': 'off-proxy-mode' },
  { 'value': 'manual', 'label': 'On', 'data-testid': 'manual-proxy-mode' },
  { 'value': 'inherit', 'label': 'System Proxy', 'data-testid': 'system-proxy-mode' },
  { 'value': 'pac', 'label': 'PAC', 'data-testid': 'pac-proxy-mode' }
];

const PROXY_PROTOCOLS = [
  { value: 'http', label: 'HTTP' },
  { value: 'https', label: 'HTTPS' },
  { value: 'socks4', label: 'SOCKS4' },
  { value: 'socks5', label: 'SOCKS5' }
];

const ProxySettings = ({ close }) => {
  const preferences = useSelector((state) => state.app.preferences);
  const dispatch = useDispatch();

  const proxySchema = Yup.object({
    disabled: Yup.boolean().optional(),
    source: Yup.string().oneOf(['manual', 'pac', 'inherit']).required(),
    pac: Yup.object({
      source: Yup.string()
        .optional()
        .test('pac-url', 'Specify a valid PAC URL', (value) => {
          if (!value) return true;
          try {
            const u = new URL(value);
            return u.protocol === 'http:' || u.protocol === 'https:' || u.protocol === 'file:';
          } catch {
            return false;
          }
        })
        .max(2048)
        .nullable()
    }).optional(),
    config: Yup.object({
      protocol: Yup.string().required().oneOf(['http', 'https', 'socks4', 'socks5']),
      hostname: Yup.string().max(1024),
      port: Yup.number()
        .min(1)
        .max(65535)
        .typeError('Specify port between 1 and 65535')
        .nullable()
        .transform((_, val) => (val ? Number(val) : null)),
      auth: Yup.object({
        disabled: Yup.boolean().optional(),
        username: Yup.string().max(1024),
        password: Yup.string().max(1024)
      }).optional(),
      bypassProxy: Yup.string().optional().max(1024)
    }).required()
  });

  const formik = useFormik({
    initialValues: {
      disabled: preferences.proxy.disabled || false,
      source: preferences.proxy.source || 'manual',
      pac: {
        source: preferences.proxy.pac?.source || ''
      },
      config: {
        protocol: preferences.proxy.config?.protocol || 'http',
        hostname: preferences.proxy.config?.hostname || '',
        port: preferences.proxy.config?.port || 0,
        auth: {
          disabled: preferences.proxy.config?.auth?.disabled || false,
          username: preferences.proxy.config?.auth?.username || '',
          password: preferences.proxy.config?.auth?.password || ''
        },
        bypassProxy: preferences.proxy.config?.bypassProxy || ''
      }
    },
    validationSchema: proxySchema,
    onSubmit: (values) => {
      onUpdate(values);
    }
  });

  const onUpdate = useCallback((values) => {
    proxySchema
      .validate(values, { abortEarly: true })
      .then((validatedProxy) => {
        dispatch(
          savePreferences({
            ...preferences,
            proxy: validatedProxy
          })
        ).catch(() => {
          toast.error('Failed to save preferences');
        });
      })
      .catch((error) => {
      });
  }, [dispatch, preferences, proxySchema]);

  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  const debouncedSave = useCallback(
    debounce((values) => {
      onUpdateRef.current(values);
    }, 500),
    []
  );

  const handleRefreshPac = () => {
    dispatch(refreshPacCache())
      .then(() => toast.success('PAC cache refreshed'))
      .catch(() => toast.error('Failed to refresh PAC cache'));
  };

  const [passwordVisible, setPasswordVisible] = useState(false);
  const [proxyMode, setProxyMode] = useState(() => {
    if (preferences.proxy.disabled) return 'off';
    if (preferences.proxy.source === 'pac') return 'pac';
    if (preferences.proxy.source === 'inherit') return 'inherit';
    return 'manual';
  });
  const [pacInputMode, setPacInputMode] = useState(() =>
    preferences.proxy.pac?.source?.startsWith('file://') ? 'file' : 'url'
  );

  useEffect(() => {
    if (formik.dirty && formik.isValid) {
      // Don't auto-save PAC mode until a URL or file is actually selected.
      if (proxyMode === 'pac' && !formik.values.pac.source) return;
      debouncedSave(formik.values);
    }
    return () => {
      debouncedSave.flush();
    };
  }, [formik.values, formik.dirty, formik.isValid, debouncedSave, proxyMode]);

  const applyMode = (mode) => {
    setProxyMode(mode);
    if (mode === 'off') {
      formik.setFieldValue('disabled', true);
      return;
    }
    formik.setFieldValue('disabled', false);
    formik.setFieldValue('source', mode);
  };

  const authEnabled = !formik.values.config.auth.disabled;

  return (
    <StyledWrapper className="w-full">
      <div className="section-header">Proxy Settings</div>
      <form className="bruno-form settings-form" onSubmit={formik.handleSubmit}>
        <SettingsGroup title="Connection">
          <SettingsField label="Mode" className="proxy-mode-field">
            <SegmentedControl
              name="mode"
              variant="outlined"
              size="md"
              ariaLabel="Proxy mode"
              data-testid="proxy-mode"
              value={proxyMode}
              onChange={applyMode}
              items={PROXY_MODES}
            />
          </SettingsField>
        </SettingsGroup>

        {proxyMode === 'inherit' ? (
          <SettingsGroup title="System Proxy">
            <div className="text-muted system-proxy-settings">
              <SystemProxy />
            </div>
          </SettingsGroup>
        ) : null}

        {proxyMode === 'manual' ? (
          <>
            <SettingsGroup title="Server">
              <SettingsField label="Protocol" className="protocol-field">
                <SegmentedControl
                  name="config.protocol"
                  variant="outlined"
                  size="md"
                  ariaLabel="Proxy protocol"
                  data-testid="proxy-protocol"
                  value={formik.values.config.protocol}
                  onChange={(value) => formik.setFieldValue('config.protocol', value)}
                  items={PROXY_PROTOCOLS}
                />
              </SettingsField>

              <div className="server-grid">
                <SettingsField label="Hostname" htmlFor="config.hostname" error={formik.errors.config?.hostname}>
                  <input
                    id="config.hostname"
                    type="text"
                    name="config.hostname"
                    className="textbox w-full"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck="false"
                    placeholder="proxy.internal"
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    value={formik.values.config.hostname || ''}
                  />
                </SettingsField>
                <SettingsField label="Port" htmlFor="config.port" error={formik.errors.config?.port}>
                  <input
                    id="config.port"
                    type="number"
                    name="config.port"
                    className="textbox w-full"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck="false"
                    placeholder="0"
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    value={formik.values.config.port}
                  />
                </SettingsField>
              </div>
            </SettingsGroup>

            <SettingsGroup>
              <CheckboxSetting
                id="config.auth.disabled"
                name="config.auth.disabled"
                label="Authentication"
                checked={authEnabled}
                onChange={(e) => formik.setFieldValue('config.auth.disabled', !e.target.checked)}
              />
              <div className="auth-grid">
                <SettingsField
                  label="Username"
                  htmlFor="config.auth.username"
                  error={formik.errors.config?.auth?.username}
                >
                  <input
                    id="config.auth.username"
                    type="text"
                    name="config.auth.username"
                    className="textbox w-full"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck="false"
                    value={formik.values.config.auth.username}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                  />
                </SettingsField>
                <SettingsField
                  label="Password"
                  htmlFor="config.auth.password"
                  error={formik.errors.config?.auth?.password}
                >
                  <div className="password-field">
                    <input
                      id="config.auth.password"
                      type={passwordVisible ? 'text' : 'password'}
                      name="config.auth.password"
                      className="password-input"
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck="false"
                      value={formik.values.config.auth.password}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      aria-label={passwordVisible ? 'Hide password' : 'Show password'}
                      onClick={() => setPasswordVisible(!passwordVisible)}
                    >
                      {passwordVisible ? (
                        <IconEyeOff size={16} strokeWidth={1.5} />
                      ) : (
                        <IconEye size={16} strokeWidth={1.5} />
                      )}
                    </button>
                  </div>
                </SettingsField>
              </div>
            </SettingsGroup>

            <SettingsGroup
              title="Bypass"
              description="Hosts that should skip the proxy — comma separated, wildcards allowed"
            >
              <SettingsField htmlFor="config.bypassProxy" error={formik.errors.config?.bypassProxy}>
                <input
                  id="config.bypassProxy"
                  type="text"
                  name="config.bypassProxy"
                  className="textbox w-full"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                  placeholder="localhost, 127.0.0.1, *.internal"
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  value={formik.values.config.bypassProxy || ''}
                />
              </SettingsField>
            </SettingsGroup>
          </>
        ) : null}

        {proxyMode === 'pac' ? (
          <SettingsGroup
            title="PAC"
            description={
              pacInputMode === 'url'
                ? 'Enter the URL to your PAC file'
                : 'Supports .pac files for automatic proxy configuration'
            }
          >
            <SettingsField error={formik.errors.pac?.source}>
              <div className="pac-mode-toggle" role="group" aria-label="PAC source type">
                <button
                  type="button"
                  className={`pac-mode-btn ${pacInputMode === 'url' ? 'active' : ''}`}
                  aria-pressed={pacInputMode === 'url'}
                  onClick={() => {
                    setPacInputMode('url');
                    formik.setFieldValue('pac.source', '');
                  }}
                >
                  URL
                </button>
                <button
                  type="button"
                  className={`pac-mode-btn ${pacInputMode === 'file' ? 'active' : ''}`}
                  aria-pressed={pacInputMode === 'file'}
                  onClick={() => {
                    setPacInputMode('file');
                    formik.setFieldValue('pac.source', '');
                  }}
                >
                  File
                </button>
              </div>
              {pacInputMode === 'url' ? (
                <input
                  id="pac.source"
                  type="text"
                  name="pac.source"
                  className="textbox pac-source-input"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  value={formik.values.pac.source || ''}
                  placeholder="https://example.com/proxy.pac"
                />
              ) : (
                <button
                  type="button"
                  className="textbox pac-source-input pac-file-btn"
                  onClick={() => {
                    window.ipcRenderer
                      .invoke('renderer:browse-pac-file')
                      .then((fileUrl) => {
                        if (fileUrl) {
                          formik.setFieldValue('pac.source', fileUrl);
                        }
                      })
                      .catch(() => toast.error('Failed to open file picker'));
                  }}
                >
                  {formik.values.pac.source
                    ? decodeURIComponent(formik.values.pac.source.split('/').pop())
                    : 'Select File'}
                </button>
              )}
            </SettingsField>
            {formik.values.pac.source ? (
              <button type="button" className="pac-refetch" onClick={handleRefreshPac}>
                <IconRefresh size={14} strokeWidth={1.5} />
                Refetch
              </button>
            ) : null}
          </SettingsGroup>
        ) : null}
      </form>
    </StyledWrapper>
  );
};

export default ProxySettings;
