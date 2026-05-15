import React from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import StyledWrapper from './StyledWrapper';
import { useTheme } from 'providers/Theme';
import { useTranslation } from 'react-i18next';

const Theme = () => {
  const { storedTheme, setStoredTheme } = useTheme();
  const { t } = useTranslation();

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      theme: storedTheme
    },
    validationSchema: Yup.object({
      theme: Yup.string().oneOf(['light', 'dark', 'system']).required(t('PREFERENCES.THEME_REQUIRED'))
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
            {t('PREFERENCES.THEME_LIGHT')}
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
            {t('PREFERENCES.THEME_DARK')}
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
            {t('PREFERENCES.THEME_SYSTEM')}
          </label>
        </div>
      </div>
    </StyledWrapper>
  );
};

export default Theme;
