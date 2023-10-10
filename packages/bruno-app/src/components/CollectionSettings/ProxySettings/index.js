import React, { useEffect } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';

import StyledWrapper from './StyledWrapper';

const ProxySettings = ({ proxyConfig, onUpdate }) => {
  const formik = useFormik({
    initialValues: {
      enabled: proxyConfig.enabled || 'global',
      protocol: proxyConfig.protocol || 'http',
      hostname: proxyConfig.hostname || '',
      port: proxyConfig.port || '',
      auth: {
        enabled: proxyConfig.auth ? proxyConfig.auth.enabled || false : false,
        username: proxyConfig.auth ? proxyConfig.auth.username || '' : '',
        password: proxyConfig.auth ? proxyConfig.auth.password || '' : ''
      },
      noProxy: proxyConfig.noProxy || ''
    },
    validationSchema: Yup.object({
      enabled: Yup.string().oneOf(['global', 'enabled', 'disabled']),
      protocol: Yup.string().oneOf(['http', 'https', 'socks5']),
      hostname: Yup.string().max(1024),
      port: Yup.number().min(0).max(65535),
      auth: Yup.object({
        enabled: Yup.boolean(),
        username: Yup.string().max(1024),
        password: Yup.string().max(1024)
      }),
      noProxy: Yup.string().max(1024)
    }),
    onSubmit: (values) => {
      onUpdate(values);
    }
  });

  useEffect(() => {
    formik.setValues({
      enabled: proxyConfig.enabled || 'global',
      protocol: proxyConfig.protocol || 'http',
      hostname: proxyConfig.hostname || '',
      port: proxyConfig.port || '',
      auth: {
        enabled: proxyConfig.auth ? proxyConfig.auth.enabled || false : false,
        username: proxyConfig.auth ? proxyConfig.auth.username || '' : '',
        password: proxyConfig.auth ? proxyConfig.auth.password || '' : ''
      },
      noProxy: proxyConfig.noProxy || ''
    });
  }, [proxyConfig]);

  return (
    <StyledWrapper>
      <h1 className="font-medium mb-3">Proxy Settings</h1>
      <label className="settings-label">
        <ul className="mb-3">
          <li>To use the global proxy configuration, choose 'use global setting'</li>
          <li>To use collection level configuration, choose 'enabled'</li>
          <li>To disable the proxy for this collection, choose 'disabled'</li>
        </ul>
      </label>
      <form className="bruno-form" onSubmit={formik.handleSubmit}>
        <div className="mb-3 flex items-center">
          <label className="settings-label" htmlFor="enabled">
            Usage
          </label>
          <div className="flex items-center">
            <label className="flex items-center">
              <input
                type="radio"
                name="enabled"
                value="global"
                checked={formik.values.enabled === 'global'}
                onChange={formik.handleChange}
                className="mr-1"
              />
              use global settings
            </label>
            <label className="flex items-center ml-4">
              <input
                type="radio"
                name="enabled"
                value="enabled"
                checked={formik.values.enabled === 'enabled'}
                onChange={formik.handleChange}
                className="mr-1"
              />
              enabled
            </label>
            <label className="flex items-center ml-4">
              <input
                type="radio"
                name="enabled"
                value="disabled"
                checked={formik.values.enabled === 'disabled'}
                onChange={formik.handleChange}
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
                checked={formik.values.protocol === 'http'}
                onChange={formik.handleChange}
                className="mr-1"
              />
              http
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
              https
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
              socks5
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
            <div className="text-red-500">{formik.errors.hostname}</div>
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
          {formik.touched.port && formik.errors.port ? <div className="text-red-500">{formik.errors.port}</div> : null}
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
              <div className="text-red-500">{formik.errors.auth.username}</div>
            ) : null}
          </div>
          <div className="mb-3 flex items-center">
            <label className="settings-label" htmlFor="auth.password">
              Password
            </label>
            <input
              id="auth.password"
              type="text"
              name="auth.password"
              className="block textbox"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              value={formik.values.auth.password}
              onChange={formik.handleChange}
            />
            {formik.touched.auth?.password && formik.errors.auth?.password ? (
              <div className="text-red-500">{formik.errors.auth.password}</div>
            ) : null}
          </div>
        </div>
        <div className="mb-3 flex items-center">
          <label className="settings-label" htmlFor="noProxy">
            Proxy Bypass
          </label>
          <input
            id="noProxy"
            type="text"
            name="noProxy"
            className="block textbox"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            onChange={formik.handleChange}
            value={formik.values.noProxy || ''}
          />
          {formik.touched.noProxy && formik.errors.noProxy ? (
            <div className="text-red-500">{formik.errors.noProxy}</div>
          ) : null}
        </div>
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
