import React, { useEffect } from 'react';
import { useFormik } from 'formik';
import InfoTip from 'components/InfoTip';
import StyledWrapper from './StyledWrapper';
import * as Yup from 'yup';
import toast from 'react-hot-toast';
import { IconEye, IconEyeOff } from '@tabler/icons';
import { useState } from 'react';
import { getProxyMode, transformProxyForStorage } from './helpers';

const ProxySettings = ({ proxyConfig, onUpdate }) => {
  const proxySchema = Yup.object({
    mode: Yup.string().oneOf(['inherit', 'on', 'off']),
    protocol: Yup.string().oneOf(['http', 'https', 'socks4', 'socks5']),
    hostname: Yup.string()
      .when('mode', {
        is: 'on',
        then: (hostname) => hostname.required('Specify the hostname for your proxy.'),
        otherwise: (hostname) => hostname.nullable()
      })
      .max(1024),
    port: Yup.number()
      .min(1)
      .max(65535)
      .typeError('Specify port between 1 and 65535')
      .nullable()
      .transform((_, val) => (val ? Number(val) : null)),
    auth: Yup.object()
      .when('mode', {
        is: 'on',
        then: Yup.object({
          enabled: Yup.boolean(),
          username: Yup.string()
            .when('enabled', {
              is: true,
              then: (username) => username.required('Specify username for proxy authentication.')
            })
            .max(1024),
          password: Yup.string()
            .when('enabled', {
              is: true,
              then: (password) => password.required('Specify password for proxy authentication.')
            })
            .max(1024)
        })
      })
      .optional(),
    bypassProxy: Yup.string().optional().max(1024)
  });

  const formik = useFormik({
    initialValues: {
      mode: getProxyMode(proxyConfig),
      protocol: proxyConfig?.protocol || 'http',
      hostname: proxyConfig?.hostname || '',
      port: proxyConfig?.port || '',
      auth: {
        enabled: proxyConfig?.auth?.enabled ?? false,
        username: proxyConfig?.auth?.username || '',
        password: proxyConfig?.auth?.password || ''
      },
      bypassProxy: proxyConfig?.bypassProxy || ''
    },
    validationSchema: proxySchema,
    onSubmit: (values) => {
      proxySchema
        .validate(values, { abortEarly: true })
        .then((validatedProxy) => {
          // Transform to new storage format
          const transformedProxy = transformProxyForStorage(validatedProxy);
          onUpdate(transformedProxy);
        })
        .catch((error) => {
          let errMsg = error.message || 'Preferences validation error';
          toast.error(errMsg);
        });
    }
  });
  const [passwordVisible, setPasswordVisible] = useState(false);

  useEffect(() => {
    formik.setValues({
      mode: getProxyMode(proxyConfig),
      protocol: proxyConfig?.protocol || 'http',
      hostname: proxyConfig?.hostname || '',
      port: proxyConfig?.port || '',
      auth: {
        enabled: proxyConfig?.auth?.enabled ?? false,
        username: proxyConfig?.auth?.username || '',
        password: proxyConfig?.auth?.password || ''
      },
      bypassProxy: proxyConfig?.bypassProxy || ''
    });
  }, [proxyConfig]);

  return (
    <StyledWrapper className="h-full w-full">
      <div className="text-xs mb-4 text-muted">Configure proxy settings for this collection.</div>
      <form className="bruno-form" onSubmit={formik.handleSubmit}>
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
                checked={formik.values.mode === 'inherit'}
                onChange={formik.handleChange}
                className="mr-1"
              />
              Inherit
            </label>
            <label className="flex items-center ml-4">
              <input
                type="radio"
                name="mode"
                value="on"
                checked={formik.values.mode === 'on'}
                onChange={formik.handleChange}
                className="mr-1"
              />
              On
            </label>
            <label className="flex items-center ml-4">
              <input
                type="radio"
                name="mode"
                value="off"
                checked={formik.values.mode === 'off'}
                onChange={formik.handleChange}
                className="mr-1"
              />
              Off
            </label>
          </div>
        </div>
        {formik.values.mode === 'on' ? (
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
                    checked={formik.values.protocol === 'http'}
                    onChange={formik.handleChange}
                    className="mr-1"
                  />
                  HTTP
                </label>
                <label className="flex items-center ml-4">
                  <input
                    type="radio"
                    name="protocol"
                    value="https"
                    checked={formik.values.protocol === 'https'}
                    onChange={formik.handleChange}
                    className="mr-1"
                  />
                  HTTPS
                </label>
                <label className="flex items-center ml-4">
                  <input
                    type="radio"
                    name="protocol"
                    value="socks4"
                    checked={formik.values.protocol === 'socks4'}
                    onChange={formik.handleChange}
                    className="mr-1"
                  />
                  SOCKS4
                </label>
                <label className="flex items-center ml-4">
                  <input
                    type="radio"
                    name="protocol"
                    value="socks5"
                    checked={formik.values.protocol === 'socks5'}
                    onChange={formik.handleChange}
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
                onChange={formik.handleChange}
                value={formik.values.hostname || ''}
              />
              {formik.touched.hostname && formik.errors.hostname ? (
                <div className="ml-3 text-red-500">{formik.errors.hostname}</div>
              ) : null}
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
                onChange={formik.handleChange}
                value={formik.values.port}
              />
              {formik.touched.port && formik.errors.port ? (
                <div className="ml-3 text-red-500">{formik.errors.port}</div>
              ) : null}
            </div>
            <div className="mb-3 flex items-center">
              <label className="settings-label" htmlFor="auth.enabled">
                Auth
              </label>
              <input
                type="checkbox"
                name="auth.enabled"
                checked={formik.values.auth.enabled}
                onChange={formik.handleChange}
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
                  value={formik.values.auth.username}
                  onChange={formik.handleChange}
                />
                {formik.touched.auth?.username && formik.errors.auth?.username ? (
                  <div className="ml-3 text-red-500">{formik.errors.auth.username}</div>
                ) : null}
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
                    value={formik.values.auth.password}
                    onChange={formik.handleChange}
                  />
                  <button
                    type="button"
                    className="btn btn-sm absolute right-0"
                    onClick={() => setPasswordVisible(!passwordVisible)}
                  >
                    {passwordVisible ? <IconEyeOff size={18} strokeWidth={1.5} /> : <IconEye size={18} strokeWidth={1.5} />}
                  </button>
                </div>
                {formik.touched.auth?.password && formik.errors.auth?.password ? (
                  <div className="ml-3 text-red-500">{formik.errors.auth.password}</div>
                ) : null}
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
                onChange={formik.handleChange}
                value={formik.values.bypassProxy || ''}
              />
              {formik.touched.bypassProxy && formik.errors.bypassProxy ? (
                <div className="ml-3 text-red-500">{formik.errors.bypassProxy}</div>
            ) : null}
          </div>
          </>
        ) : null}
        <div className="mt-6">
          <button type="submit" className="submit btn btn-sm btn-secondary">
            Save
          </button>
        </div>
      </form>
    </StyledWrapper>
  );
};

export default ProxySettings;