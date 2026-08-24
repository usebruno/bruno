import React, { useRef, useEffect, useCallback } from 'react';
import get from 'lodash/get';
import debounce from 'lodash/debounce';
import { useFormik } from 'formik';
import { useSelector, useDispatch } from 'react-redux';
import { savePreferences } from 'providers/ReduxStore/slices/app';
import { browseDirectory } from 'providers/ReduxStore/slices/collections/actions';
import StyledWrapper from './StyledWrapper';
import * as Yup from 'yup';
import toast from 'react-hot-toast';
import FileUploadField from 'ui/FileUploadField';
import { SettingsGroup, CheckboxSetting, SettingsField } from '../SettingsLayout';

const General = () => {
  const preferences = useSelector((state) => state.app.preferences);
  const dispatch = useDispatch();

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
        .test('isValidInterval', 'Save Delay must be at least 500ms', (value) => {
          return value === undefined || Number(value) >= 500;
        })
    }).test('intervalRequired', 'Save Delay is required when Auto Save is enabled', (value) => {
      // If autosave is enabled, interval must be provided
      if (value.enabled && (value.interval === undefined || value.interval === '')) {
        return false;
      }
      return true;
    }),
    oauth2: Yup.object({
      useSystemBrowser: Yup.boolean()
    }),
    defaultLocation: Yup.string().max(1024)
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
      oauth2: {
        useSystemBrowser: get(preferences, 'request.oauth2.useSystemBrowser', false)
      },
      defaultLocation: get(preferences, 'general.defaultLocation', '')
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

  const handleSave = useCallback((newPreferences) => {
    dispatch(
      savePreferences({
        ...preferences,
        request: {
          ...preferences.request,
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
          sendCookies: newPreferences.sendCookies,
          oauth2: {
            useSystemBrowser: newPreferences.oauth2.useSystemBrowser
          }
        },
        autoSave: {
          enabled: newPreferences.autoSave.enabled,
          interval: newPreferences.autoSave.interval
        },
        general: {
          defaultLocation: newPreferences.defaultLocation
        }
      }))
      .catch((err) => console.log(err) && toast.error('Failed to update preferences'));
  }, [dispatch, preferences]);

  const handleSaveRef = useRef(handleSave);
  handleSaveRef.current = handleSave;

  const debouncedSave = useCallback(
    debounce((values) => {
      preferencesSchema.validate(values, { abortEarly: true })
        .then((validatedValues) => {
          handleSaveRef.current(validatedValues);
        })
        .catch((error) => {
        });
    }, 500),
    []
  );

  useEffect(() => {
    if (formik.dirty && formik.isValid) {
      debouncedSave(formik.values);
    }
    return () => {
      debouncedSave.flush();
    };
  }, [formik.values, formik.dirty, formik.isValid, debouncedSave]);

  const browseDefaultLocation = () => {
    dispatch(browseDirectory())
      .then((dirPath) => {
        if (typeof dirPath === 'string') {
          formik.setFieldValue('defaultLocation', dirPath);
        }
      })
      .catch((error) => {
        formik.setFieldValue('defaultLocation', '');
        console.error(error);
      });
  };

  const customCaCertificateEnabled = formik.values.customCaCertificate.enabled;
  const customCaCertificatePath = formik.values.customCaCertificate.filePath;
  const keepDefaultCaCertificatesDisabled = !(customCaCertificateEnabled && customCaCertificatePath);
  const autoSaveEnabled = formik.values.autoSave.enabled;

  const autoSaveError
    = typeof formik.errors.autoSave === 'string' ? formik.errors.autoSave : formik.errors.autoSave?.interval;

  return (
    <StyledWrapper className="w-full">
      <div className="section-header">General Settings</div>
      <form className="bruno-form settings-form" onSubmit={formik.handleSubmit}>
        <SettingsGroup title="Certificates">
          <CheckboxSetting
            id="sslVerification"
            name="sslVerification"
            label="SSL/TLS Certificate Verification"
            checked={formik.values.sslVerification}
            onChange={formik.handleChange}
          />
          <CheckboxSetting
            id="customCaCertificateEnabled"
            name="customCaCertificate.enabled"
            label="Use Custom CA Certificate"
            checked={customCaCertificateEnabled}
            onChange={formik.handleChange}
          >
            <div className="ca-certificate-picker">
              <FileUploadField
                id="caCertFilePath"
                value={customCaCertificatePath}
                onChange={(filePath) => formik.setFieldValue('customCaCertificate.filePath', filePath)}
                placeholder="No certificate selected"
                disabled={!customCaCertificateEnabled}
                clearLabel="Remove custom CA certificate"
              />
            </div>
            <CheckboxSetting
              id="keepDefaultCaCertificatesEnabled"
              name="keepDefaultCaCertificates.enabled"
              label="Keep Default CA Certificates"
              checked={formik.values.keepDefaultCaCertificates.enabled}
              onChange={formik.handleChange}
              disabled={keepDefaultCaCertificatesDisabled}
            />
          </CheckboxSetting>
        </SettingsGroup>

        <SettingsGroup title="Cookies & Authorization">
          <CheckboxSetting
            id="storeCookies"
            name="storeCookies"
            label="Store Cookies automatically"
            checked={formik.values.storeCookies}
            onChange={formik.handleChange}
          />
          <CheckboxSetting
            id="sendCookies"
            name="sendCookies"
            label="Send Cookies automatically"
            checked={formik.values.sendCookies}
            onChange={formik.handleChange}
          />
          <CheckboxSetting
            id="oauth2.useSystemBrowser"
            name="oauth2.useSystemBrowser"
            label="Use System Browser for OAuth2 Authorization"
            checked={formik.values.oauth2.useSystemBrowser}
            onChange={formik.handleChange}
          />
        </SettingsGroup>

        <SettingsGroup title="Timing">
          <div className="timing-grid">
            <SettingsField
              label="Save Delay (ms)"
              htmlFor="autoSaveInterval"
              disabled={!autoSaveEnabled}
              error={autoSaveError}
            >
              <input
                id="autoSaveInterval"
                type="text"
                name="autoSave.interval"
                className="textbox w-full"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                value={formik.values.autoSave.interval}
                disabled={!autoSaveEnabled}
              />
            </SettingsField>
            <SettingsField label="Request Timeout (ms)" htmlFor="timeout" error={formik.errors.timeout}>
              <input
                id="timeout"
                type="text"
                name="timeout"
                className="textbox w-full"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                value={formik.values.timeout}
              />
            </SettingsField>
          </div>
          <CheckboxSetting
            id="autoSaveEnabled"
            name="autoSave.enabled"
            label="Enable Auto Save"
            checked={autoSaveEnabled}
            onChange={formik.handleChange}
          />
        </SettingsGroup>

        <SettingsGroup
          title="Default Location"
          description="Used as the default location for new workspaces and collections"
        >
          <SettingsField
            htmlFor="defaultLocation"
            error={formik.errors.defaultLocation}
            className="default-location-field"
          >
            <input
              type="text"
              name="defaultLocation"
              id="defaultLocation"
              className="textbox cursor-pointer default-location-input"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              readOnly={true}
              onChange={formik.handleChange}
              value={formik.values.defaultLocation || ''}
              onClick={browseDefaultLocation}
              placeholder="Click to browse for default location"
            />
            <button type="button" className="default-location-browse" onClick={browseDefaultLocation}>
              Browse
            </button>
          </SettingsField>
        </SettingsGroup>
      </form>
    </StyledWrapper>
  );
};

export default General;
