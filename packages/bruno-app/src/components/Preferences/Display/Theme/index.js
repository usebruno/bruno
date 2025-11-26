import React from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import StyledWrapper from './StyledWrapper';
import { useTheme } from 'providers/Theme';

const Theme = () => {
  const { storedTheme, setStoredTheme } = useTheme();

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      theme: storedTheme
    },
    validationSchema: Yup.object({
      theme: Yup.string().oneOf(['light', 'dark', 'system']).required('theme is required')
    }),
    onSubmit: (values) => {
      setStoredTheme(values.theme);
    }
  });

  return (
    <StyledWrapper>
      <div className="bruno-form">
        <div className="flex items-center mt-2">
          <input
            id="light-theme"
            className="cursor-pointer"
            type="radio"
            name="theme"
            onChange={(e) => {
              formik.handleChange(e);
              formik.handleSubmit();
            }}
            value="light"
            checked={formik.values.theme === 'light'}
          />
          <label htmlFor="light-theme" className="ml-1 cursor-pointer select-none">
            Light
          </label>

          <input
            id="dark-theme"
            className="ml-4 cursor-pointer"
            type="radio"
            name="theme"
            onChange={(e) => {
              formik.handleChange(e);
              formik.handleSubmit();
            }}
            value="dark"
            checked={formik.values.theme === 'dark'}
          />
          <label htmlFor="dark-theme" className="ml-1 cursor-pointer select-none">
            Dark
          </label>

          <input
            id="system-theme"
            className="ml-4 cursor-pointer"
            type="radio"
            name="theme"
            onChange={(e) => {
              formik.handleChange(e);
              formik.handleSubmit();
            }}
            value="system"
            checked={formik.values.theme === 'system'}
          />
          <label htmlFor="system-theme" className="ml-1 cursor-pointer select-none">
            System
          </label>
        </div>
      </div>
    </StyledWrapper>
  );
};

export default Theme;
