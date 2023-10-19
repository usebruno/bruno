import React from 'react';
import { useFormik } from 'formik';
import { useSelector, useDispatch } from 'react-redux';
import { savePreferences } from 'providers/ReduxStore/slices/app';
import StyledWrapper from './StyledWrapper';
import * as Yup from 'yup';
import toast from 'react-hot-toast';

const General = ({ close }) => {
  const preferences = useSelector((state) => state.app.preferences);
  const dispatch = useDispatch();

  const preferencesSchema = Yup.object().shape({
    sslVerification: Yup.boolean(),
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
      timeout: preferences.request.timeout
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
          timeout: newPreferences.timeout
        }
      })
    )
      .then(() => {
        close();
      })
      .catch((err) => console.log(err) && toast.error('Failed to update preferences'));
  };

  return (
    <StyledWrapper>
      <form className="bruno-form" onSubmit={formik.handleSubmit}>
        <div className="flex items-center mt-2">
          <label className="block font-medium mr-2 select-none" style={{ minWidth: 200 }} htmlFor="sslVerification">
            SSL/TLS Certificate Verification
          </label>
          <input
            id="ssl-cert-verification"
            type="checkbox"
            name="sslVerification"
            checked={formik.values.sslVerification}
            onChange={formik.handleChange}
            className="mousetrap mr-0"
          />
        </div>
        <div className="flex flex-col mt-6">
          <label className="block font-medium select-none" htmlFor="timeout">
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
