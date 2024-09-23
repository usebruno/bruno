import React, { useEffect } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import toast from 'react-hot-toast';
import { savePreferences } from 'providers/ReduxStore/slices/app';

import StyledWrapper from './StyledWrapper';
import { useDispatch, useSelector } from 'react-redux';
import { IconEye, IconEyeOff } from '@tabler/icons';
import { useState } from 'react';

const ProxySettings = ({ close }) => {
  const preferences = useSelector((state) => state.app.preferences);
  const systemProxyEnvVariables = useSelector((state) => state.app.systemProxyEnvVariables);
  const { http_proxy, https_proxy, no_proxy } = systemProxyEnvVariables || {};
  const dispatch = useDispatch();
  console.log(preferences);

  const proxySchema = Yup.object({
    mode: Yup.string().oneOf(['off', 'on', 'system']),
    protocol: Yup.string().required().oneOf(['http', 'https', 'socks4', 'socks5']),
    hostname: Yup.string()
      .when('enabled', {
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
      .when('enabled', {
        is: 'on',
        then: Yup.object({
          enabled: Yup.boolean(),
          username: Yup.string()
            .when(['enabled'], {
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
      mode: preferences.proxy.mode,
      protocol: preferences.proxy.protocol || 'http',
      hostname: preferences.proxy.hostname || '',
      port: preferences.proxy.port || 0,
      auth: {
        enabled: preferences.proxy.auth ? preferences.proxy.auth.enabled || false : false,
        username: preferences.proxy.auth ? preferences.proxy.auth.username || '' : '',
        password: preferences.proxy.auth ? preferences.proxy.auth.password || '' : ''
      },
      bypassProxy: preferences.proxy.bypassProxy || ''
    },
    validationSchema: proxySchema,
    onSubmit: (values) => {
      onUpdate(values);
    }
  });

  const onUpdate = (values) => {
    proxySchema
      .validate(values, { abortEarly: true })
      .then((validatedProxy) => {
        dispatch(
          savePreferences({
            ...preferences,
            proxy: validatedProxy
          })
        ).then(() => {
          close();
        });
      })
      .catch((error) => {
        let errMsg = error.message || 'Preferences validation error';
        toast.error(errMsg);
      });
  };

  const [passwordVisible, setPasswordVisible] = useState(false);

  useEffect(() => {
    formik.setValues({
      mode: preferences.proxy.mode,
      protocol: preferences.proxy.protocol || 'http',
      hostname: preferences.proxy.hostname || '',
      port: preferences.proxy.port || '',
      auth: {
        enabled: preferences.proxy.auth ? preferences.proxy.auth.enabled || false : false,
        username: preferences.proxy.auth ? preferences.proxy.auth.username || '' : '',
        password: preferences.proxy.auth ? preferences.proxy.auth.password || '' : ''
      },
      bypassProxy: preferences.proxy.bypassProxy || ''
    });
  }, [preferences]);

  return (
    <StyledWrapper>
      <form className="bruno-form" onSubmit={formik.handleSubmit}>
        <div className="mb-3 flex items-center mt-2">
          <label className="settings-label" htmlFor="protocol">
            Mode
          </label>
          <div className="flex items-center">
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                name="mode"
                value="false"
                checked={formik.values.mode === 'off'}
                onChange={(e) => {
                  formik.setFieldValue('mode', 'off');
                }}
                className="mr-1 cursor-pointer"
              />
              Off
            </label>
            <label className="flex items-center ml-4 cursor-pointer">
              <input
                type="radio"
                name="mode"
                value="true"
                checked={formik.values.mode === 'on'}
                onChange={(e) => {
                  formik.setFieldValue('mode', 'on');
                }}
                className="mr-1 cursor-pointer"
              />
              On
            </label>
            <label className="flex items-center ml-4 cursor-pointer">
              <input
                type="radio"
                name="mode"
                value="system"
                checked={formik.values.mode === 'system'}
                onChange={formik.handleChange}
                className="mr-1 cursor-pointer"
              />
              System Proxy
            </label>
          </div>
        </div>
        {formik?.values?.mode === 'system' ? (
          <div className="mb-3 pt-1 text-muted system-proxy-settings">
            <small>
              Below values are sourced from your system environment variables and cannot be directly updated in Bruno.<br/>
              Please refer to your OS documentation to change these values.
            </small>
            <div className="flex flex-col justify-start items-start pt-2">
              <div className="mb-1 flex items-center">
                <label className="settings-label" htmlFor="http_proxy">
                  http_proxy
                </label>
                <div className="opacity-80">{http_proxy || '-'}</div>
              </div>
              <div className="mb-1 flex items-center">
                <label className="settings-label" htmlFor="https_proxy">
                  https_proxy
                </label>
                <div className="opacity-80">{https_proxy || '-'}</div>
              </div>
              <div className="mb-1 flex items-center">
                <label className="settings-label" htmlFor="no_proxy">
                  no_proxy
                </label>
                <div className="opacity-80">{no_proxy || '-'}</div>
              </div>
            </div>
          </div>
        ) : null}
        {formik?.values?.mode === 'on' ? (
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
                <div className="textbox flex flex-row items-center w-[13.2rem] h-[2.25rem] relative">
                  <input
                    id="auth.password"
                    type={passwordVisible ? `text` : 'password'}
                    name="auth.password"
                    className="outline-none w-[10.5rem] bg-transparent"
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
                    {passwordVisible ? <IconEyeOff size={18} strokeWidth={2} /> : <IconEye size={18} strokeWidth={2} />}
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
          <button type="submit" className="submit btn btn-md btn-secondary">
            Save
          </button>
        </div>
      </form>
    </StyledWrapper>
  );
};

export default ProxySettings;
