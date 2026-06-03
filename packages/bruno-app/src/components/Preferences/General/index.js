import React, { useRef, useEffect, useCallback, useState } from 'react';
import get from 'lodash/get';
import debounce from 'lodash/debounce';
import { useFormik } from 'formik';
import { useSelector, useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { savePreferences } from 'providers/ReduxStore/slices/app';
import { browseDirectory } from 'providers/ReduxStore/slices/collections/actions';
import StyledWrapper from './StyledWrapper';
import * as Yup from 'yup';
import toast from 'react-hot-toast';
import path from 'utils/common/path';
import { IconTrash, IconChevronDown } from '@tabler/icons';
import i18n from '../../../i18n';

const General = () => {
  const { t } = useTranslation();
  const preferences = useSelector((state) => state.app.preferences);
  const dispatch = useDispatch();
  const inputFileCaCertificateRef = useRef();
  const [languageDropdownOpen, setLanguageDropdownOpen] = useState(false);
  const languageDropdownRef = useRef();

  const currentLanguage = i18n.language || i18n.languages?.[0] || 'zh';

  const LANGUAGES = [
    { code: 'zh', label: t('PREFERENCES_PAGE.LANGUAGE_ZH') },
    { code: 'en', label: t('PREFERENCES_PAGE.LANGUAGE_EN') }
  ];

  const handleLanguageSelect = (langCode) => {
    i18n.changeLanguage(langCode);
    try {
      localStorage.setItem('bruno-language', langCode);
    } catch (e) {}
    setLanguageDropdownOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (languageDropdownRef.current && !languageDropdownRef.current.contains(event.target)) {
        setLanguageDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
      .test('isNumber', t('PREFERENCES_PAGE.REQUEST_TIMEOUT_MUST_BE_A_NUMBER'), (value) => {
        return value === undefined || !isNaN(value);
      })
      .test('isValidTimeout', t('PREFERENCES_PAGE.REQUEST_TIMEOUT_MUST_BE_EQUAL_OR_GREATER_THAN_0'), (value) => {
        return value === undefined || Number(value) >= 0;
      }),
    autoSave: Yup.object({
      enabled: Yup.boolean(),
      interval: Yup.mixed()
        .transform((value, originalValue) => {
          return originalValue === '' ? undefined : value;
        })
        .test('isNumber', t('PREFERENCES_PAGE.SAVE_DELAY_MUST_BE_A_NUMBER'), (value) => {
          return value === undefined || !isNaN(value);
        })
        .test('isValidInterval', t('PREFERENCES_PAGE.SAVE_DELAY_MUST_BE_AT_LEAST_500MS'), (value) => {
          return value === undefined || Number(value) >= 500;
        })
    }).test('intervalRequired', t('PREFERENCES_PAGE.SAVE_DELAY_REQUIRED'), (value) => {
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
      .catch((err) => console.log(err) && toast.error(t('PREFERENCES_PAGE.FAILED_TO_UPDATE_PREFERENCES')));
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
          formik.setFieldValue('defaultLocation', dirPath);
        }
      })
      .catch((error) => {
        formik.setFieldValue('defaultLocation', '');
        console.error(error);
      });
  };

  return (
    <StyledWrapper className="w-full">
      <div className="section-header">{t('PREFERENCES_PAGE.GENERAL_SETTINGS')}</div>
      <form className="bruno-form" onSubmit={formik.handleSubmit}>
        <div className="flex flex-col mt-0 mb-4" ref={languageDropdownRef}>
          <label className="block select-none mb-1" htmlFor="language-selector">
            {t('PREFERENCES_PAGE.LANGUAGE')}
          </label>
          <div className="language-selector">
            <div
              className="language-selector-trigger"
              onClick={() => setLanguageDropdownOpen(!languageDropdownOpen)}
            >
              <span>{LANGUAGES.find((l) => l.code === currentLanguage)?.label || currentLanguage}</span>
              <IconChevronDown
                size={14}
                strokeWidth={2}
                style={{
                  transform: languageDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.15s ease'
                }}
              />
            </div>
            {languageDropdownOpen && (
              <div className="language-dropdown-menu">
                {LANGUAGES.map((lang) => (
                  <div
                    key={lang.code}
                    className={`language-option ${currentLanguage === lang.code ? 'selected' : ''}`}
                    onClick={() => handleLanguageSelect(lang.code)}
                  >
                    {lang.label}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center mb-2">
          <input
            id="sslVerification"
            type="checkbox"
            name="sslVerification"
            checked={formik.values.sslVerification}
            onChange={formik.handleChange}
            className="mousetrap mr-0"
          />
          <label className="block ml-2 select-none" htmlFor="sslVerification">
            {t('PREFERENCES_PAGE.SSL_TLS_CERTIFICATE_VERIFICATION')}
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
            {t('PREFERENCES_PAGE.USE_CUSTOM_CA_CERT')}
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
              {t('PREFERENCES_PAGE.SELECT_FILE')}
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
            {t('PREFERENCES_PAGE.KEEP_DEFAULT_CA_CERTIFICATES')}
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
            {t('PREFERENCES_PAGE.STORE_COOKIES_AUTOMATICALLY')}
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
            {t('PREFERENCES_PAGE.SEND_COOKIES_AUTOMATICALLY')}
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
            {t('PREFERENCES_PAGE.USE_SYSTEM_BROWSER_FOR_OAUTH2')}
          </label>
        </div>
        <div className="flex flex-col mt-6">
          <label className="block select-none" htmlFor="timeout">
            {t('PREFERENCES_PAGE.REQUEST_TIMEOUT_IN_MS')}
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
            {t('PREFERENCES_PAGE.ENABLE_AUTO_SAVE')}
          </label>
        </div>
        <div className={`flex flex-col mt-2 ${!formik.values.autoSave.enabled ? 'opacity-50' : ''}`}>
          <label className="block select-none" htmlFor="autoSaveInterval">
            {t('PREFERENCES_PAGE.SAVE_DELAY_IN_MS')}
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
          <label className="block select-none default-location-label" htmlFor="defaultLocation">
            {t('PREFERENCES_PAGE.DEFAULT_LOCATION_LABEL')}
          </label>
          <p className="text-muted mt-1 text-xs">
            {t('PREFERENCES_PAGE.DEFAULT_LOCATION_DESC_LABEL')}
          </p>
          <input
            type="text"
            name="defaultLocation"
            id="defaultLocation"
            className="block textbox mt-2 w-full cursor-pointer default-location-input"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            readOnly={true}
            onChange={formik.handleChange}
            value={formik.values.defaultLocation || ''}
            onClick={browseDefaultLocation}
            placeholder={t('PREFERENCES_PAGE.BROWSE_DEFAULT_LOCATION_PLACEHOLDER')}
          />
          <div className="mt-1">
            <span
              className="text-link cursor-pointer hover:underline default-location-browse"
              onClick={browseDefaultLocation}
            >
              {t('PREFERENCES_PAGE.BROWSE')}
            </span>
          </div>
        </div>
        {formik.touched.defaultLocation && formik.errors.defaultLocation ? (
          <div className="text-red-500">{formik.errors.defaultLocation}</div>
        ) : null}
      </form>
    </StyledWrapper>
  );
};

export default General;
