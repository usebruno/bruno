import React, { useEffect } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';

import StyledWrapper from './StyledWrapper';

const ProxySettings = ({ proxyConfig, onUpdate }) => {
  const formik = useFormik({
    initialValues: {
      enabled: proxyConfig.enabled || false,
      protocol: proxyConfig.protocol || 'http',
      hostname: proxyConfig.hostname || '',
      port: proxyConfig.port || '',
      auth: {
        enabled: proxyConfig.auth ? proxyConfig.auth.enabled || false : false,
        username: proxyConfig.auth ? proxyConfig.auth.username || '' : '',
        password: proxyConfig.auth ? proxyConfig.auth.password || '' : ''
      }
    },
    validationSchema: Yup.object({
      enabled: Yup.boolean(),
      protocol: Yup.string().oneOf(['http', 'https']),
      hostname: Yup.string().max(1024),
      port: Yup.number().min(0).max(65535),
      auth: Yup.object({
        enabled: Yup.boolean(),
        username: Yup.string().max(1024),
        password: Yup.string().max(1024)
      })
    }),
    onSubmit: (values) => {
      onUpdate(values);
    }
  });

  useEffect(() => {
    formik.setValues({
      enabled: proxyConfig.enabled || false,
      protocol: proxyConfig.protocol || 'http',
      hostname: proxyConfig.hostname || '',
      port: proxyConfig.port || '',
      auth: {
        enabled: proxyConfig.auth ? proxyConfig.auth.enabled || false : false,
        username: proxyConfig.auth ? proxyConfig.auth.username || '' : '',
        password: proxyConfig.auth ? proxyConfig.auth.password || '' : ''
      }
    });
  }, [proxyConfig]);

  return (
    <StyledWrapper>
      <h1 className="font-medium mb-3">Proxy Settings</h1>
      <form className="bruno-form" onSubmit={formik.handleSubmit}>
        <div className="ml-4 mb-3 flex items-center">
          <label className="settings-label" htmlFor="enabled">
            Enabled
          </label>
          <input type="checkbox" name="enabled" checked={formik.values.enabled} onChange={formik.handleChange} />
        </div>
        <div className="ml-4 mb-3 flex items-center">
          <label className="settings-label" htmlFor="protocol">
            Protocol
          </label>
          <div className="flex items-center">
            <label className="flex items-center mr-4">
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
            <label className="flex items-center">
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
          </div>
        </div>
        <div className="ml-4 mb-3 flex items-center">
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
        <div className="ml-4 mb-3 flex items-center">
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
        <div className="ml-4 mb-3 flex items-center">
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
          <div className="ml-4 mb-3 flex items-center">
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
          <div className="ml-4 mb-3 flex items-center">
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
