import React, { useRef } from 'react';
import get from 'lodash/get';
import { useFormik } from 'formik';
import { useSelector, useDispatch } from 'react-redux';
import { savePreferences } from 'providers/ReduxStore/slices/app';
import StyledWrapper from './StyledWrapper';
import * as Yup from 'yup';
import toast from 'react-hot-toast';
import path from 'utils/common/path';
import { IconTrash, IconLock, IconCookie, IconClock } from '@tabler/icons';
import Switch from 'react-switch';

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
      })
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
      sendCookies: get(preferences, 'request.sendCookies', true)
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
        }
      })
    )
      .then(() => {
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

  const switchProps = {
    onColor: "#f59e0b",
    offColor: "#ccc",
    height: 16,
    width: 32,
    handleDiameter: 12,
    uncheckedIcon: false,
    checkedIcon: false,
  };

  return (
    <StyledWrapper>
      <h4 className="text-lg font-medium mb-5">General</h4>
      <form className="bruno-form" onSubmit={formik.handleSubmit}>
        <h2 className="section-title">
          <IconLock size={18} strokeWidth={1.5} />
          SSL & Security
        </h2>

        <div className="setting-item">
          <div className="setting-item-left">
            <div className="setting-label">SSL Verification</div>
            <div className="setting-description">Verify SSL certificates when making requests</div>
          </div>
          <Switch
            id="sslVerification"
            checked={formik.values.sslVerification}
            onChange={(checked) => formik.setFieldValue('sslVerification', checked)}
            {...switchProps}
          />
        </div>

        <div className="setting-item">
          <div className="setting-item-left">
            <div className="setting-label">Custom CA Certificate</div>
            <div className="setting-description">Use a custom CA certificate for SSL verification</div>
          </div>
          <Switch
            id="customCaCertificateEnabled"
            checked={formik.values.customCaCertificate.enabled}
            onChange={(checked) => formik.setFieldValue('customCaCertificate.enabled', checked)}
            {...switchProps}
          />
        </div>

        {formik.values.customCaCertificate.filePath ? (
          <div className={`setting-item pl-6 ${formik.values.customCaCertificate.enabled ? '' : 'opacity-25'}`}>
            <span className="flex items-center border px-2 rounded-md">
              {path.basename(formik.values.customCaCertificate.filePath)}
              <button
                type="button"
                tabIndex="-1"
                className="pl-1"
                disabled={!formik.values.customCaCertificate.enabled}
                onClick={deleteCaCertificate}
              >
                <IconTrash strokeWidth={1.5} size={14} />
              </button>
            </span>
          </div>
        ) : (
          <div className={`setting-item pl-6 ${formik.values.customCaCertificate.enabled ? '' : 'opacity-25'}`}>
            <button
              type="button"
              tabIndex="-1"
              className="flex items-center border px-2 rounded-md"
              disabled={!formik.values.customCaCertificate.enabled}
              onClick={() => inputFileCaCertificateRef.current.click()}
            >
              select file
              <input
                id="caCertFilePath"
                type="file"
                name="customCaCertificate.filePath"
                className="hidden"
                ref={inputFileCaCertificateRef}
                disabled={!formik.values.customCaCertificate.enabled}
                onChange={addCaCertificate}
              />
            </button>
          </div>
        )}

        <div className="setting-item">
          <div className="setting-item-left">
            <div className="setting-label">Keep default CA Certificates</div>
          </div>
          <Switch
            id="keepDefaultCaCertificatesEnabled"
            checked={formik.values.keepDefaultCaCertificates.enabled}
            onChange={(checked) => formik.setFieldValue('keepDefaultCaCertificates.enabled', checked)}
            {...switchProps}
            disabled={!formik.values.customCaCertificate.enabled}
          />
        </div>

        <h2 className="section-title">
          <IconCookie size={18} strokeWidth={1.5} />
          Cookie Management
        </h2>

        <div className="setting-item">
          <div className="setting-item-left">
            <div className="setting-label">Store Cookies Automatically</div>
            <div className="setting-description">Automatically save cookies from responses</div>
          </div>
          <Switch
            id="storeCookies"
            checked={formik.values.storeCookies}
            onChange={(checked) => formik.setFieldValue('storeCookies', checked)}
            {...switchProps}
          />
        </div>

        <div className="setting-item">
          <div className="setting-item-left">
            <div className="setting-label">Send Cookies Automatically</div>
            <div className="setting-description">Automatically include cookies in requests</div>
          </div>
          <Switch
            id="sendCookies"
            checked={formik.values.sendCookies}
            onChange={(checked) => formik.setFieldValue('sendCookies', checked)}
            {...switchProps}
          />
        </div>

        <h2 className="section-title">
          <IconClock size={18} strokeWidth={1.5} />
          Request Settings
        </h2>

        <div className="setting-item">
          <div className="setting-item-left">
            <div className="setting-label">Request Timeout</div>
            <div className="setting-description">Maximum time to wait for a response</div>
          </div>
          <div className="timeout-input">
            <input
              type="text"
              name="timeout"
              className="setting-input"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              onChange={formik.handleChange}
              value={formik.values.timeout}
            />
            <span className="unit">ms</span>
          </div>
        </div>

        <div className="mt-6">
          <button type="submit" className="btn btn-md btn-secondary">
            Save Changes
          </button>
        </div>
      </form>
    </StyledWrapper>
  );
};

export default General;
