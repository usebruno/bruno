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
import path from 'utils/common/path';
import { IconTrash } from '@tabler/icons';

const General = () => {
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
    oauth2: Yup.object({
      useSystemBrowser: Yup.boolean()
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
      oauth2: {
        useSystemBrowser: get(preferences, 'request.oauth2.useSystemBrowser', false)
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

  const handleSave = useCallback((newPreferences) => {
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
          defaultCollectionLocation: newPreferences.defaultCollectionLocation
        }
      }))
      .catch((err) => console.log(err) && toast.error('Failed to update preferences'));
  }, [dispatch, preferences]);

  const debouncedSave = useCallback(
    debounce((values) => {
      preferencesSchema.validate(values, { abortEarly: true })
        .then((validatedValues) => {
          handleSave(validatedValues);
        })
        .catch((error) => {
        });
    }, 500),
    [handleSave]
  );

  useEffect(() => {
    if (formik.dirty && formik.isValid) {
      debouncedSave(formik.values);
    }
    return () => {
      debouncedSave.cancel();
    };
  }, [formik.values, formik.dirty, formik.isValid, debouncedSave]);

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

  return (
    <StyledWrapper className="w-full">
      <form className="bruno-form" onSubmit={formik.handleSubmit}>
        <div className="flex items-center my-2">
          <input
            id="sslVerification"
            type="checkbox"
            name="sslVerification"
            checked={formik.values.sslVerification}
            onChange={formik.handleChange}
            className="mousetrap mr-0"
          />
          <label className="block ml-2 select-none" htmlFor="sslVerification">
            SSL/TLS Certificate Verification
          </label>
        </div>
        <div className="flex items-center mt-2">
          <input
            id="customCaCertificateEnabled"
            type="checkbox"
            name="customCaCertificate.enabled"
            checked={formik.values.customCaCertificate.enabled}
            onChange={formik.handleChange}
            className="mousetrap mr-0"
          />
          <label className="block ml-2 select-none" htmlFor="customCaCertificateEnabled">
            Use Custom CA Certificate
          </label>
        </div>
        {formik.values.customCaCertificate.filePath ? (
          <div
            className={`flex items-center mt-2 pl-6 ${formik.values.customCaCertificate.enabled ? '' : 'opacity-25'}`}
          >
            <span className="flex items-center border px-2 rounded-md">
              {path.basename(formik.values.customCaCertificate.filePath)}
              <button
                type="button"
                tabIndex="-1"
                className="pl-1"
                disabled={formik.values.customCaCertificate.enabled ? false : true}
                onClick={deleteCaCertificate}
              >
                <IconTrash strokeWidth={1.5} size={14} />
              </button>
            </span>
          </div>
        ) : (
          <div
            className={`flex items-center mt-2 pl-6 ${formik.values.customCaCertificate.enabled ? '' : 'opacity-25'}`}
          >
            <button
              type="button"
              tabIndex="-1"
              className="flex items-center border px-2 rounded-md"
              disabled={formik.values.customCaCertificate.enabled ? false : true}
              onClick={() => inputFileCaCertificateRef.current.click()}
            >
              select file
              <input
                id="caCertFilePath"
                type="file"
                name="customCaCertificate.filePath"
                className="hidden"
                ref={inputFileCaCertificateRef}
                disabled={formik.values.customCaCertificate.enabled ? false : true}
                onChange={addCaCertificate}
              />
            </button>
          </div>
        )}
        <div className="flex items-center mt-2">
          <input
            id="keepDefaultCaCertificatesEnabled"
            type="checkbox"
            name="keepDefaultCaCertificates.enabled"
            checked={formik.values.keepDefaultCaCertificates.enabled}
            onChange={formik.handleChange}
            className={`mousetrap mr-0 ${formik.values.customCaCertificate.enabled && formik.values.customCaCertificate.filePath ? '' : 'opacity-25'}`}
            disabled={formik.values.customCaCertificate.enabled && formik.values.customCaCertificate.filePath ? false : true}
          />
          <label
            className={`block ml-2 select-none ${formik.values.customCaCertificate.enabled && formik.values.customCaCertificate.filePath ? '' : 'opacity-25'}`}
            htmlFor="keepDefaultCaCertificatesEnabled"
          >
            Keep Default CA Certificates
          </label>
        </div>
        <div className="flex items-center mt-2">
          <input
            id="storeCookies"
            type="checkbox"
            name="storeCookies"
            checked={formik.values.storeCookies}
            onChange={formik.handleChange}
            className="mousetrap mr-0"
          />
          <label className="block ml-2 select-none" htmlFor="storeCookies">
            Store Cookies automatically
          </label>
        </div>
        <div className="flex items-center mt-2">
          <input
            id="sendCookies"
            type="checkbox"
            name="sendCookies"
            checked={formik.values.sendCookies}
            onChange={formik.handleChange}
            className="mousetrap mr-0"
          />
          <label className="block ml-2 select-none" htmlFor="sendCookies">
            Send Cookies automatically
          </label>
        </div>
        <div className="flex items-center mt-2">
          <input
            id="oauth2.useSystemBrowser"
            type="checkbox"
            name="oauth2.useSystemBrowser"
            checked={formik.values.oauth2.useSystemBrowser}
            onChange={formik.handleChange}
            className="mousetrap mr-0"
          />
          <label className="block ml-2 select-none" htmlFor="oauth2.useSystemBrowser">
            Use System Browser for OAuth2 Authorization
          </label>
        </div>
        <div className="flex flex-col mt-6">
          <label className="block select-none" htmlFor="timeout">
            Request Timeout (in ms)
          </label>
          <input
            type="text"
            name="timeout"
            className="block textbox mt-2 w-16"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            onChange={formik.handleChange}
            value={formik.values.timeout}
          />
        </div>
        {formik.touched.timeout && formik.errors.timeout ? (
          <div className="text-red-500">{formik.errors.timeout}</div>
        ) : null}
        <div className="flex items-center mt-6">
          <input
            id="autoSaveEnabled"
            type="checkbox"
            name="autoSave.enabled"
            checked={formik.values.autoSave.enabled}
            onChange={formik.handleChange}
            className="mousetrap mr-0"
          />
          <label className="block ml-2 select-none" htmlFor="autoSaveEnabled">
            Enable Auto Save
          </label>
        </div>
        <div className={`flex flex-col mt-2 ${!formik.values.autoSave.enabled ? 'opacity-50' : ''}`}>
          <label className="block select-none" htmlFor="autoSaveInterval">
            Save Delay (in ms)
          </label>
          <input
            type="text"
            name="autoSave.interval"
            id="autoSaveInterval"
            className="block textbox mt-2 w-24"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            onChange={formik.handleChange}
            value={formik.values.autoSave.interval}
            disabled={!formik.values.autoSave.enabled}
          />
        </div>
        {formik.touched.autoSave && formik.errors.autoSave && typeof formik.errors.autoSave === 'string' && (
          <div className="text-red-500">{formik.errors.autoSave}</div>
        )}
        {formik.touched.autoSave?.interval && formik.errors.autoSave?.interval && (
          <div className="text-red-500">{formik.errors.autoSave.interval}</div>
        )}
        <div className="flex flex-col mt-6">
          <label className="block select-none default-collection-location-label" htmlFor="defaultCollectionLocation">
            Default Collection Location
          </label>
          <input
            type="text"
            name="defaultCollectionLocation"
            id="defaultCollectionLocation"
            className="block textbox mt-2 w-full cursor-pointer default-collection-location-input"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            readOnly={true}
            onChange={formik.handleChange}
            value={formik.values.defaultCollectionLocation || ''}
            onClick={browseDefaultLocation}
            placeholder="Click to browse for default location"
          />
          <div className="mt-1">
            <span
              className="text-link cursor-pointer hover:underline default-collection-location-browse"
              onClick={browseDefaultLocation}
            >
              Browse
            </span>
          </div>
        </div>
        {formik.touched.defaultCollectionLocation && formik.errors.defaultCollectionLocation ? (
          <div className="text-red-500">{formik.errors.defaultCollectionLocation}</div>
        ) : null}
      </form>
    </StyledWrapper>
  );
};

export default General;
