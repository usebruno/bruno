import React from 'react';
import { useFormik } from 'formik';
import { useSelector, useDispatch } from 'react-redux';
import * as Yup from 'yup';
import StyledWrapper from './StyledWrapper';
import { savePreferences } from 'providers/ReduxStore/slices/app';

const RequestView = () => {
  const preferences = useSelector((state) => state.app.preferences);
  const dispatch = useDispatch();

  const formik = useFormik({
    initialValues: {
      requestView: preferences.viewRequestBy
    },
    validationSchema: Yup.object({
      requestView: Yup.string().oneOf(['name', 'url']).required('requestView is required')
    }),
    onSubmit: async (values) => {
      handleSave(values);      
    }
  });

  const handleSave = (values) => {
    dispatch(
      savePreferences({
        ...preferences,
        viewRequestBy: values.requestView
      })
    )
    .catch((err) => console.log(err) && toast.error('Failed to update preferences'));
  };

  return (
    <StyledWrapper>
      <div className="bruno-form">
        <div className="flex items-center mt-2">
          <input
            id="name-requestView"
            className="cursor-pointer"
            type="radio"
            name="requestView"
            onChange={(e) => {
              formik.handleChange(e);
              formik.handleSubmit();
            }}
            value="name"
            checked={formik.values.requestView === 'name'}
          />
          <label htmlFor="name-requestView" className="ml-1 cursor-pointer select-none">
            Name
          </label>

          <input
            id="url-requestView"
            className="ml-4 cursor-pointer"
            type="radio"
            name="requestView"
            onChange={(e) => {
              formik.handleChange(e);
              formik.handleSubmit();
            }}
            value="url"
            checked={formik.values.requestView === 'url'}
          />
          <label htmlFor="url-requestView" className="ml-1 cursor-pointer select-none">
            Url
          </label>
        </div>
      </div>
    </StyledWrapper>
  );
};

export default RequestView;
