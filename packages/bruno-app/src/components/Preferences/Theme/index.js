import React from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import StyledWrapper from './StyledWrapper';
import { useTheme } from 'providers/Theme';

const Theme = () => {
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
      <div className="bruno-form"></div>
    </StyledWrapper>
  );
};

export default Theme;
