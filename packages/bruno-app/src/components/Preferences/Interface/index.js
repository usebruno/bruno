import React from 'react';
import { get } from 'lodash';
import StyledWrapper from './StyledWrapper';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useSelector, useDispatch } from 'react-redux';
import { savePreferences } from 'providers/ReduxStore/slices/app';

const Interface = (props) => {
  const preferences = useSelector((state) => state.app.preferences);
  const dispatch = useDispatch();

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      autoHideMenu: get(preferences, 'interface.autoHideMenu', false)
    },
    validationSchema: Yup.object({
      autoHideMenu: Yup.boolean()
    }),
    onSubmit: (values) => {
      dispatch(
        savePreferences({
          ...preferences,
          interface: {
            autoHideMenu: values.autoHideMenu
          }
        })
      );
    }
  });

  return (
    <StyledWrapper>
      <form className="bruno-form" onSubmit={formik.handleSubmit}>
        <div className="flex items-center mt-2">
          <input
            id="autoHideMenu"
            type="checkbox"
            name="autoHideMenu"
            checked={formik.values.autoHideMenu}
            onChange={formik.handleChange}
            className="mousetrap mr-0"
          />
          <label className="block ml-2 select-none" htmlFor="sslVerification">
            Auto hide global menu (<small>Will need restart</small>)
          </label>
        </div>

        <div className="mt-10">
          <button type="submit" className="submit btn btn-sm btn-secondary">
            Save
          </button>
        </div>
      </form>
    </StyledWrapper>
  );
};

export default Interface;
