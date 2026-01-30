import React, { useEffect, useCallback } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import debounce from 'lodash/debounce';
import toast from 'react-hot-toast';
import { savePreferences } from 'providers/ReduxStore/slices/app';

import StyledWrapper from './StyledWrapper';
import { useDispatch, useSelector } from 'react-redux';
import { IconEye, IconEyeOff } from '@tabler/icons';
import { useState } from 'react';
import SystemProxy from './SystemProxy';

const ProxySettings = ({ close }) => {
  const preferences = useSelector((state) => state.app.preferences);
  const dispatch = useDispatch();

  const proxySchema = Yup.object({
    disabled: Yup.boolean().optional(),
    inherit: Yup.boolean().required(),
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
      inherit: preferences.proxy.inherit || false,
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

  const debouncedSave = useCallback(
    debounce((values) => {
      onUpdate(values);
    }, 500),
    [onUpdate]
  );

  const [passwordVisible, setPasswordVisible] = useState(false);

  useEffect(() => {
    formik.setValues({
      disabled: preferences.proxy.disabled || false,
      inherit: preferences.proxy.inherit || false,
      config: {
        protocol: preferences.proxy.config?.protocol || 'http',
        hostname: preferences.proxy.config?.hostname || '',
        port: preferences.proxy.config?.port || '',
        auth: {
          disabled: preferences.proxy.config?.auth?.disabled || false,
          username: preferences.proxy.config?.auth?.username || '',
          password: preferences.proxy.config?.auth?.password || ''
        },
        bypassProxy: preferences.proxy.config?.bypassProxy || ''
      }
    });
  }, [preferences]);

  useEffect(() => {
    if (formik.dirty) {
      debouncedSave(formik.values);
    }
    return () => {
      debouncedSave.cancel();
    };
  }, [formik.values, formik.dirty, debouncedSave]);

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
                value="off"
                checked={formik.values.disabled === true}
                onChange={(e) => {
                  formik.setFieldValue('disabled', true);
                  formik.setFieldValue('inherit', false);
                }}
                className="mr-1 cursor-pointer"
              />
              Off
            </label>
            <label className="flex items-center ml-4 cursor-pointer">
              <input
                type="radio"
                name="mode"
                value="on"
                checked={formik.values.disabled === false && formik.values.inherit === false}
                onChange={(e) => {
                  formik.setFieldValue('disabled', false);
                  formik.setFieldValue('inherit', false);
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
                checked={formik.values.disabled === false && formik.values.inherit === true}
                onChange={(e) => {
                  formik.setFieldValue('disabled', false);
                  formik.setFieldValue('inherit', true);
                }}
                className="mr-1 cursor-pointer"
              />
              System Proxy
            </label>
          </div>
        </div>
        {formik.values.disabled === false && formik.values.inherit === true ? (
          <div className="mb-3 pt-1 text-muted system-proxy-settings">
            <SystemProxy />
          </div>
        ) : null}
        {formik.values.disabled === false && formik.values.inherit === false ? (
          <>
            <div className="mb-3 flex items-center">
              <label className="settings-label" htmlFor="protocol">
                Protocol
              </label>
              <div className="flex items-center">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="config.protocol"
                    value="http"
                    checked={formik.values.config.protocol === 'http'}
                    onChange={formik.handleChange}
                    className="mr-1"
                  />
                  HTTP
                </label>
                <label className="flex items-center ml-4">
                  <input
                    type="radio"
                    name="config.protocol"
                    value="https"
                    checked={formik.values.config.protocol === 'https'}
                    onChange={formik.handleChange}
                    className="mr-1"
                  />
                  HTTPS
                </label>
                <label className="flex items-center ml-4">
                  <input
                    type="radio"
                    name="config.protocol"
                    value="socks4"
                    checked={formik.values.config.protocol === 'socks4'}
                    onChange={formik.handleChange}
                    className="mr-1"
                  />
                  SOCKS4
                </label>
                <label className="flex items-center ml-4">
                  <input
                    type="radio"
                    name="config.protocol"
                    value="socks5"
                    checked={formik.values.config.protocol === 'socks5'}
                    onChange={formik.handleChange}
                    className="mr-1"
                  />
                  SOCKS5
                </label>
              </div>
            </div>
            <div className="mb-3 flex items-center">
              <label className="settings-label" htmlFor="config.hostname">
                Hostname
              </label>
              <input
                id="config.hostname"
                type="text"
                name="config.hostname"
                className="block textbox"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                onChange={formik.handleChange}
                value={formik.values.config.hostname || ''}
              />
              {formik.touched.config?.hostname && formik.errors.config?.hostname ? (
                <div className="ml-3 text-red-500">{formik.errors.config.hostname}</div>
              ) : null}
            </div>
            <div className="mb-3 flex items-center">
              <label className="settings-label" htmlFor="config.port">
                Port
              </label>
              <input
                id="config.port"
                type="number"
                name="config.port"
                className="block textbox"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                onChange={formik.handleChange}
                value={formik.values.config.port}
              />
              {formik.touched.config?.port && formik.errors.config?.port ? (
                <div className="ml-3 text-red-500">{formik.errors.config.port}</div>
              ) : null}
            </div>
            <div className="mb-3 flex items-center">
              <label className="settings-label" htmlFor="config.auth.disabled">
                Auth
              </label>
              <input
                id="config.auth.disabled"
                type="checkbox"
                name="config.auth.disabled"
                checked={!formik.values.config.auth.disabled}
                onChange={(e) => {
                  formik.setFieldValue('config.auth.disabled', !e.target.checked);
                }}
                className="mousetrap mr-0"
              />
            </div>
            <div>
              <div className="mb-3 flex items-center">
                <label className="settings-label" htmlFor="config.auth.username">
                  Username
                </label>
                <input
                  id="config.auth.username"
                  type="text"
                  name="config.auth.username"
                  className="block textbox"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                  value={formik.values.config.auth.username}
                  onChange={formik.handleChange}
                />
                {formik.touched.config?.auth?.username && formik.errors.config?.auth?.username ? (
                  <div className="ml-3 text-red-500">{formik.errors.config.auth.username}</div>
                ) : null}
              </div>
              <div className="mb-3 flex items-center">
                <label className="settings-label" htmlFor="config.auth.password">
                  Password
                </label>
                <div className="textbox flex flex-row items-center w-[13.2rem] h-[2.25rem] relative">
                  <input
                    id="config.auth.password"
                    type={passwordVisible ? `text` : 'password'}
                    name="config.auth.password"
                    className="outline-none w-[10.5rem] bg-transparent"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck="false"
                    value={formik.values.config.auth.password}
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
                {formik.touched.config?.auth?.password && formik.errors.config?.auth?.password ? (
                  <div className="ml-3 text-red-500">{formik.errors.config.auth.password}</div>
                ) : null}
              </div>
            </div>
            <div className="mb-3 flex items-center">
              <label className="settings-label" htmlFor="config.bypassProxy">
                Proxy Bypass
              </label>
              <input
                id="config.bypassProxy"
                type="text"
                name="config.bypassProxy"
                className="block textbox"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                onChange={formik.handleChange}
                value={formik.values.config.bypassProxy || ''}
              />
              {formik.touched.config?.bypassProxy && formik.errors.config?.bypassProxy ? (
                <div className="ml-3 text-red-500">{formik.errors.config.bypassProxy}</div>
              ) : null}
            </div>
          </>
        ) : null}
      </form>
    </StyledWrapper>
  );
};

export default ProxySettings;
