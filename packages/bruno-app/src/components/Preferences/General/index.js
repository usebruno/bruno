import React, { useRef } from 'react';
import get from 'lodash/get';
import { useFormik } from 'formik';
import { useSelector, useDispatch } from 'react-redux';
import { savePreferences } from 'providers/ReduxStore/slices/app';
import { browseDirectory } from 'providers/ReduxStore/slices/collections/actions';
import StyledWrapper from './StyledWrapper';
import * as Yup from 'yup';
import toast from 'react-hot-toast';
import path from 'utils/common/path';
import { IconTrash } from '@tabler/icons';
import ToggleSwitch from 'components/ToggleSwitch';

const General = ({ close }) => {
  const preferences = useSelector((state) => state.app.preferences);
  const dispatch = useDispatch();
  const inputFileCaCertificateRef = useRef();

  const preferencesSchema = Yup.object().shape({
    sslVerification: Yup.boolean(),
    customCaCertificate: Yup.object({
      enabled: Yup.boolean(),
      filePath: Yup.string().nullable()
    }),
    keepDefaultCaCertificates: Yup.object({
      enabled: Yup.boolean()
    }),
    storeCookies: Yup.boolean(),
    sendCookies: Yup.boolean(),
    timeout: Yup.mixed()
      .transform((value, originalValue) => {
        return originalValue === '' ? undefined : value;
      })
      .nullable()
      .test('isNumber', 'Request Timeout must be a number', (value) => {
        return value === undefined || !isNaN(value);
      })
      .test('isValidTimeout', 'Request Timeout must be equal or greater than 0', (value) => {
        return value === undefined || Number(value) >= 0;
      }),
    autoSave: Yup.object({
      enabled: Yup.boolean(),
      interval: Yup.mixed()
        .transform((value, originalValue) => {
          return originalValue === '' ? undefined : value;
        })
        .test('isNumber', 'Save Delay must be a number', (value) => {
          return value === undefined || !isNaN(value);
        })
        .test('isValidInterval', 'Save Delay must be at least 100ms', (value) => {
          return value === undefined || Number(value) >= 100;
        })
    }).test('intervalRequired', 'Save Delay is required when Auto Save is enabled', (value) => {
      // If autosave is enabled, interval must be provided
      if (value.enabled && (value.interval === undefined || value.interval === '')) {
        return false;
      }
      return true;
    }),
    defaultCollectionLocation: Yup.string().max(1024)
  });

  const formik = useFormik({
    initialValues: {
      sslVerification: preferences.request.sslVerification,
      customCaCertificate: {
        enabled: get(preferences, 'request.customCaCertificate.enabled', false),
        filePath: get(preferences, 'request.customCaCertificate.filePath', null)
      },
      keepDefaultCaCertificates: {
        enabled: get(preferences, 'request.keepDefaultCaCertificates.enabled', true)
      },
      timeout: preferences.request.timeout,
      storeCookies: get(preferences, 'request.storeCookies', true),
      sendCookies: get(preferences, 'request.sendCookies', true),
      autoSave: {
        enabled: get(preferences, 'autoSave.enabled', false),
        interval: get(preferences, 'autoSave.interval', 1000)
      },
      defaultCollectionLocation: get(preferences, 'general.defaultCollectionLocation', '')
    },
    validationSchema: preferencesSchema,
    onSubmit: async (values) => {
      try {
        const newPreferences = await preferencesSchema.validate(values, { abortEarly: true });
        handleSave(newPreferences);
      } catch (error) {
        console.error('Preferences validation error:', error.message);
      }
    }
  });

  const handleSave = (newPreferences) => {
    dispatch(
      savePreferences({
        ...preferences,
        request: {
          sslVerification: newPreferences.sslVerification,
          customCaCertificate: {
            enabled: newPreferences.customCaCertificate.enabled,
            filePath: newPreferences.customCaCertificate.filePath
          },
          keepDefaultCaCertificates: {
            enabled: newPreferences.keepDefaultCaCertificates.enabled
          },
          timeout: newPreferences.timeout,
          storeCookies: newPreferences.storeCookies,
          sendCookies: newPreferences.sendCookies
        },
        general: {
          defaultCollectionLocation: newPreferences.defaultCollectionLocation
        },
        autoSave: {
          enabled: newPreferences.autoSave.enabled,
          interval: newPreferences.autoSave.interval
        }
      }))
      .then(() => {
        toast.success('Preferences saved successfully');
        close();
      })
      .catch((err) => console.log(err) && toast.error('Failed to update preferences'));
  };

  const addCaCertificate = (e) => {
    const filePath = window?.ipcRenderer?.getFilePath(e?.target?.files?.[0]);
    if (filePath) {
      formik.setFieldValue('customCaCertificate.filePath', filePath);
    }
  };

  const deleteCaCertificate = () => {
    formik.setFieldValue('customCaCertificate.filePath', null);
  };

  const browseDefaultLocation = () => {
    dispatch(browseDirectory())
      .then((dirPath) => {
        if (typeof dirPath === 'string') {
          formik.setFieldValue('defaultCollectionLocation', dirPath);
        }
      })
      .catch((error) => {
        formik.setFieldValue('defaultCollectionLocation', '');
        console.error(error);
      });
  };

  // Reusable setting row component
  const SettingRow = ({ label, isOn, onToggle, disabled }) => (
    <div className={`setting-row flex items-center justify-between ${disabled ? 'opacity-50' : ''}`}>
      <div className="flex flex-col">
        <span className="font-medium text-sm">{label}</span>
      </div>
      <ToggleSwitch isOn={isOn} handleToggle={disabled ? undefined : onToggle} size="2xs" />
    </div>
  );

  const isKeepDefaultCaDisabled = !formik.values.customCaCertificate.enabled || !formik.values.customCaCertificate.filePath;

  return (
    <StyledWrapper>
      <form className="bruno-form" onSubmit={formik.handleSubmit}>
        {/* SSL & Certificates */}
        <div className="settings-section">
          <h3 className="section-title">Security</h3>

          <SettingRow
            label="SSL/TLS Certificate Verification"
            isOn={formik.values.sslVerification}
            onToggle={() => formik.setFieldValue('sslVerification', !formik.values.sslVerification)}
          />

          <SettingRow
            label="Use Custom CA Certificate"
            isOn={formik.values.customCaCertificate.enabled}
            onToggle={() => formik.setFieldValue('customCaCertificate.enabled', !formik.values.customCaCertificate.enabled)}
          />

          {formik.values.customCaCertificate.enabled && (
            <div className="ml-4 py-1">
              {formik.values.customCaCertificate.filePath ? (
                <span className="text-xs px-2 py-1 border rounded hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center max-w-max">
                  {path.basename(formik.values.customCaCertificate.filePath)}
                  <button
                    type="button"
                    tabIndex="-1"
                    className="pl-1"
                    onClick={deleteCaCertificate}
                  >
                    <IconTrash strokeWidth={1.5} size={14} />
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  tabIndex="-1"
                  className="text-xs px-2 py-1 border rounded hover:bg-gray-50 dark:hover:bg-gray-700"
                  onClick={() => inputFileCaCertificateRef.current.click()}
                >
                  Select File
                  <input
                    id="caCertFilePath"
                    type="file"
                    name="customCaCertificate.filePath"
                    className="hidden"
                    ref={inputFileCaCertificateRef}
                    onChange={addCaCertificate}
                  />
                </button>
              )}
            </div>
          )}

          <SettingRow
            label="Keep Default CA Certificates"
            isOn={formik.values.keepDefaultCaCertificates.enabled}
            onToggle={() => formik.setFieldValue('keepDefaultCaCertificates.enabled', !formik.values.keepDefaultCaCertificates.enabled)}
            disabled={isKeepDefaultCaDisabled}
          />
        </div>

        {/* Cookies */}
        <div className="settings-section">
          <h3 className="section-title">Cookies</h3>

          <SettingRow
            label="Store Cookies Automatically"
            isOn={formik.values.storeCookies}
            onToggle={() => formik.setFieldValue('storeCookies', !formik.values.storeCookies)}
          />

          <SettingRow
            label="Send Cookies Automatically"
            isOn={formik.values.sendCookies}
            onToggle={() => formik.setFieldValue('sendCookies', !formik.values.sendCookies)}
          />
        </div>

        {/* Request Settings */}
        <div className="settings-section">
          <h3 className="section-title">Request</h3>

          <div className="py-2">
            <label className="font-medium text-sm block mb-1" htmlFor="timeout">
              Timeout (ms)
            </label>
            <input
              type="text"
              name="timeout"
              id="timeout"
              className="block textbox w-24"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              onChange={formik.handleChange}
              value={formik.values.timeout}
            />
            {formik.touched.timeout && formik.errors.timeout && (
              <div className="text-red-500 text-sm mt-1">{formik.errors.timeout}</div>
            )}
          </div>
        </div>

        {/* Auto Save */}
        <div className="settings-section">
          <h3 className="section-title">Auto Save</h3>

          <SettingRow
            label="Enable Auto Save"
            isOn={formik.values.autoSave.enabled}
            onToggle={() => formik.setFieldValue('autoSave.enabled', !formik.values.autoSave.enabled)}
          />

          <div className={`py-2 ${!formik.values.autoSave.enabled ? 'opacity-50' : ''}`}>
            <label className="font-medium text-sm block mb-1" htmlFor="autoSaveInterval">
              Save Delay (ms)
            </label>
            <input
              type="text"
              name="autoSave.interval"
              id="autoSaveInterval"
              className="block textbox w-24"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              onChange={formik.handleChange}
              value={formik.values.autoSave.interval}
              disabled={!formik.values.autoSave.enabled}
            />
            {formik.touched.autoSave?.interval && formik.errors.autoSave?.interval && (
              <div className="text-red-500 text-sm mt-1">{formik.errors.autoSave.interval}</div>
            )}
            {typeof formik.errors.autoSave === 'string' && (
              <div className="text-red-500 text-sm mt-1">{formik.errors.autoSave}</div>
            )}
          </div>
        </div>

        {/* Storage */}
        <div className="settings-section">
          <h3 className="section-title">Storage</h3>

          <div className="py-2">
            <label className="font-medium text-sm block mb-1" htmlFor="defaultCollectionLocation">
              Default Collection Location
            </label>
            <input
              type="text"
              name="defaultCollectionLocation"
              className="block textbox w-full cursor-pointer"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              onChange={formik.handleChange}
              value={formik.values.defaultCollectionLocation || ''}
              onClick={browseDefaultLocation}
              placeholder="Click to browse for default location"
            />
            <div className="mt-1">
              <span
                className="text-link cursor-pointer hover:underline text-sm"
                onClick={browseDefaultLocation}
              >
                Browse
              </span>
            </div>
            {formik.touched.defaultCollectionLocation && formik.errors.defaultCollectionLocation && (
              <div className="text-red-500 text-sm mt-1">{formik.errors.defaultCollectionLocation}</div>
            )}
          </div>
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

export default General;
