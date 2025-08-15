import React from 'react';
import { useFormik } from 'formik';
import { useSelector, useDispatch } from 'react-redux';
import { saveUserData } from 'providers/ReduxStore/slices/app';
import StyledWrapper from './StyledWrapper';
import * as Yup from 'yup';
import toast from 'react-hot-toast';
import { browseDirectory } from 'providers/ReduxStore/slices/collections/actions';

const UserData = ({ close }) => {
  const userData = useSelector((state) => state.app.userData);
  const dispatch = useDispatch();

  const userDataSchema = Yup.object().shape({
    userData: Yup.string().required('User data path is required')
  });

  const formik = useFormik({
    initialValues: {
      userData: userData ?? ''
    },
    validationSchema: userDataSchema,
    onSubmit: async (values) => {
      try {
        const validated = await userDataSchema.validate(values, { abortEarly: true });
        handleSave(validated.userData);
      } catch (error) {
        console.error('User data validation error:', error.message);
      }
    }
  });

  const handleSave = (newUserData) => {
    dispatch(saveUserData(newUserData))
      .then(() => {
        toast.success('User data saved successfully');
        close();
      })
      .catch((err) => {
        console.log(err);
        const reducedMessage = err.message?.replace(`Error invoking remote method 'renderer:save-user-data':`, '');
        toast.error('Failed to update user data: ' + reducedMessage);
      });
  };

  const browse = () => {
    dispatch(browseDirectory())
      .then((dirPath) => {
        // When the user closes the dialog without selecting anything dirPath will be false
        if (typeof dirPath === 'string') {
          formik.setFieldValue('userData', dirPath);
        }
      })
      .catch((error) => {
        formik.setFieldValue('userData', '');
        console.error(error);
      });
  };
  return (
    <StyledWrapper>
      <form className="bruno-form" onSubmit={formik.handleSubmit}>
        <div className="flex flex-col mt-6">
          <label className="block select-none" htmlFor="userData">
            User data
          </label>
          <input
            type="text"
            name="userData"
            className="block textbox mt-2 w-96"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            onClick={browse}
            onChange={(e) => {
              formik.setFieldValue('userData', e.target.value);
            }}
            value={formik.values.userData}
          />
        </div>
        {formik.touched.userData && formik.errors.userData ? (
          <div className="text-red-500">{formik.errors.userData}</div>
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

export default UserData;
