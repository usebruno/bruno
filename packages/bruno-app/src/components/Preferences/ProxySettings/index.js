import React, { useEffect, useCallback, useRef } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import debounce from 'lodash/debounce';
import toast from 'react-hot-toast';
import { savePreferences, refreshPacCache } from 'providers/ReduxStore/slices/app';

import StyledWrapper from './StyledWrapper';
import { useDispatch, useSelector } from 'react-redux';
import { IconEye, IconEyeOff, IconRefresh, IconChevronDown } from '@tabler/icons';
import { useState } from 'react';
import SystemProxy from './SystemProxy';
import Checkbox from 'ui/Checkbox';
import MenuDropdown from 'ui/MenuDropdown';
import SegmentedControl from 'ui/SegmentedControl';
import FormField from 'ui/patterns/FormField';
import FieldList from 'ui/patterns/FieldList';

const PROXY_MODE_OPTIONS = [
  { 'value': 'off', 'label': 'Off', 'data-testid': 'off-proxy-mode' },
  { 'value': 'manual', 'label': 'Custom', 'data-testid': 'manual-proxy-mode' },
  { 'value': 'inherit', 'label': 'System Proxy', 'data-testid': 'system-proxy-mode' },
  { 'value': 'pac', 'label': 'PAC', 'data-testid': 'pac-proxy-mode' }
];

const PROXY_PROTOCOL_OPTIONS = [
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
        .max(2048, 'PAC URL must be less than 2048 characters')
        .nullable()
    }).optional(),
    config: Yup.object({
      protocol: Yup.string().required().oneOf(['http', 'https', 'socks4', 'socks5']),
      hostname: Yup.string().max(1024, 'Hostname must be less than 1024 characters'),
      port: Yup.number()
        .min(1, 'Port must be between 1 and 65535.')
        .max(65535, 'Port must be between 1 and 65535.')
        .typeError('Port must be between 1 and 65535.')
        .nullable()
        .transform((_, val) => (val ? Number(val) : null)),
      auth: Yup.object({
        disabled: Yup.boolean().optional(),
        username: Yup.string().max(1024, 'Username must be less than 1024 characters'),
        password: Yup.string().max(1024, 'Password must be less than 1024 characters')
      }).optional(),
      bypassProxy: Yup.string().optional().max(1024, 'Bypass proxy must be less than 1024 characters')
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

  // Mode picker: Off sets disabled; the other modes clear it and set the source
  const handleProxyModeChange = (mode) => {
    setProxyMode(mode);
    if (mode === 'off') {
      formik.setFieldValue('disabled', true);
      return;
    }
    formik.setFieldValue('disabled', false);
    formik.setFieldValue('source', mode);
  };

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

  const fieldError = (touched, error) => (touched && error ? error : undefined);
  const protocol = formik.values.config.protocol;

  return (
    <StyledWrapper>
      <div className="section-header">Proxy Settings</div>
      <form className="bruno-form proxy-settings" onSubmit={formik.handleSubmit}>
        <FieldList dividers>
          <FormField label="Mode" labelId="preferences-proxy-mode-label">
            <SegmentedControl
              ariaLabelledBy="preferences-proxy-mode-label"
              name="mode"
              value={proxyMode}
              onChange={handleProxyModeChange}
              items={PROXY_MODE_OPTIONS}
              data-testid="preferences-proxy-mode"
            />
          </FormField>

          {proxyMode === 'inherit' ? (
            <div className="text-muted system-proxy-settings">
              <SystemProxy />
            </div>
          ) : null}

          {proxyMode === 'manual' ? (
            <>
              <div className="flex flex-col gap-3">
                <div className="w-[200px]">
                  <FormField label="Protocol" labelId="preferences-proxy-protocol-label">
                    <MenuDropdown
                      items={PROXY_PROTOCOL_OPTIONS.map(({ value, label }) => ({
                        id: value,
                        label,
                        onClick: () => formik.setFieldValue('config.protocol', value)
                      }))}
                      selectedItemId={protocol}
                      placement="bottom-start"
                      data-testid="preferences-proxy-protocol-menu"
                      appendTo={() => document.body}
                      popperOptions={{ strategy: 'fixed' }}
                      sameWidth
                    >
                      <button
                        type="button"
                        id="preferences-proxy-protocol-trigger"
                        className="protocol-trigger"
                        aria-labelledby="preferences-proxy-protocol-label preferences-proxy-protocol-trigger"
                        data-testid="preferences-proxy-protocol"
                      >
                        <span>{PROXY_PROTOCOL_OPTIONS.find((option) => option.value === protocol)?.label ?? protocol}</span>
                        <IconChevronDown size={14} strokeWidth={2} />
                      </button>
                    </MenuDropdown>
                  </FormField>
                </div>
                <div className="grid grid-cols-[1fr_96px] gap-3">
                  <FormField
                    label="Hostname"
                    htmlFor="config.hostname"
                    error={fieldError(formik.touched.config?.hostname, formik.errors.config?.hostname)}
                  >
                    <input
                      id="config.hostname"
                      type="text"
                      name="config.hostname"
                      className="textbox"
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck="false"
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      value={formik.values.config.hostname || ''}
                    />
                  </FormField>
                  <FormField
                    label="Port"
                    htmlFor="config.port"
                    error={fieldError(formik.touched.config?.port, formik.errors.config?.port)}
                  >
                    <input
                      id="config.port"
                      type="number"
                      name="config.port"
                      className="textbox"
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck="false"
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      value={formik.values.config.port}
                    />
                  </FormField>
                </div>
              </div>

              <div className="flex flex-col gap-2.5">
                <FormField layout="leading" label="Proxy authentication" htmlFor="config.auth.disabled">
                  <Checkbox
                    id="config.auth.disabled"
                    name="config.auth.disabled"
                    checked={!formik.values.config.auth.disabled}
                    onChange={(e) => {
                      formik.setFieldValue('config.auth.disabled', !e.target.checked);
                    }}
                    inputClassName="mousetrap"
                    data-testid="preferences-proxy-auth"
                  />
                </FormField>
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    label="Username"
                    htmlFor="config.auth.username"
                    error={fieldError(formik.touched.config?.auth?.username, formik.errors.config?.auth?.username)}
                  >
                    <input
                      id="config.auth.username"
                      type="text"
                      name="config.auth.username"
                      className="textbox"
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck="false"
                      value={formik.values.config.auth.username}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                    />
                  </FormField>
                  <FormField
                    label="Password"
                    htmlFor="config.auth.password"
                    error={fieldError(formik.touched.config?.auth?.password, formik.errors.config?.auth?.password)}
                  >
                    <div className="textbox password-field">
                      <input
                        id="config.auth.password"
                        type={passwordVisible ? `text` : 'password'}
                        name="config.auth.password"
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
                        {passwordVisible ? <IconEyeOff size={16} strokeWidth={2} /> : <IconEye size={16} strokeWidth={2} />}
                      </button>
                    </div>
                  </FormField>
                </div>
              </div>

              <FormField
                label="Proxy bypass"
                description="Separate hosts with commas. Wildcards are supported."
                descriptionId="config.bypassProxy-description"
                htmlFor="config.bypassProxy"
                error={fieldError(formik.touched.config?.bypassProxy, formik.errors.config?.bypassProxy)}
              >
                <input
                  id="config.bypassProxy"
                  aria-describedby="config.bypassProxy-description"
                  type="text"
                  name="config.bypassProxy"
                  className="textbox"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  value={formik.values.config.bypassProxy || ''}
                />
              </FormField>
            </>
          ) : null}

          {proxyMode === 'pac' ? (
            <FormField
              label="PAC"
              labelId="preferences-proxy-pac-label"
              descriptionId="pac.source-description"
              description={pacInputMode === 'url'
                ? 'Enter the URL to your PAC file'
                : 'Supports .pac files for automatic proxy configuration'}
              error={fieldError(formik.touched.pac?.source, formik.errors.pac?.source)}
            >
              <div className="flex flex-col gap-2 w-full">
                <div className="flex items-center gap-3">
                  <div className="pac-mode-toggle" role="group" aria-labelledby="preferences-proxy-pac-label">
                    <button
                      type="button"
                      className={`pac-mode-btn ${pacInputMode === 'url' ? 'active' : ''}`}
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
                      aria-describedby="pac.source-description"
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
                      aria-describedby="pac.source-description"
                      onClick={() => {
                        window.ipcRenderer
                          .invoke('renderer:browse-pac-file')
                          .then((fileUrl) => {
                            if (fileUrl) {
                              formik.setFieldValue('pac.source', fileUrl);
                              formik.setFieldTouched('pac.source', true, false);
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
                </div>
                {formik.values.pac.source ? (
                  <span
                    className="text-link cursor-pointer hover:underline flex flex-row items-center w-fit"
                    onClick={handleRefreshPac}
                  >
                    <IconRefresh size={14} strokeWidth={1.5} className="mr-1" />
                    Refetch
                  </span>
                ) : null}
              </div>
            </FormField>
          ) : null}
        </FieldList>
      </form>
    </StyledWrapper>
  );
};

export default ProxySettings;
