import React, { useRef } from 'react';
import get from 'lodash/get';
import { useFormik } from 'formik';
import { useSelector, useDispatch } from 'react-redux';
import { savePreferences } from 'providers/ReduxStore/slices/app';
import StyledWrapper from './StyledWrapper';
import * as Yup from 'yup';
import toast from 'react-hot-toast';
import path from 'path';
import slash from 'utils/common/slash';
import { IconTrash } from '@tabler/icons';

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
    formik.setFieldValue('customCaCertificate.filePath', e.target.files[0]?.path);
  };

  const deleteCaCertificate = () => {
    formik.setFieldValue('customCaCertificate.filePath', null);
  };

  return (
    <StyledWrapper>
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
            Use custom CA Certificate
          </label>
        </div>
        {formik.values.customCaCertificate.filePath ? (
          <div
            className={`flex items-center mt-2 pl-6 ${formik.values.customCaCertificate.enabled ? '' : 'opacity-25'}`}
          >
            <span className="flex items-center border px-2 rounded-md">
              {path.basename(slash(formik.values.customCaCertificate.filePath))}
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
            className={`mousetrap mr-0 ${formik.values.customCaCertificate.enabled ? '' : 'opacity-25'}`}
            disabled={formik.values.customCaCertificate.enabled ? false : true}
          />
          <label
            className={`block ml-2 select-none ${formik.values.customCaCertificate.enabled ? '' : 'opacity-25'}`}
            htmlFor="keepDefaultCaCertificatesEnabled"
          >
            Keep default CA Certificates
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
        <div className="mt-10">
          <button type="submit" className="submit btn btn-sm btn-secondary">
            Save
          </button>
        </div>
      </form>
    </StyledWrapper>
  );
};

export default General;
