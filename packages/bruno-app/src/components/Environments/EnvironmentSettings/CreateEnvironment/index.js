import React, { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { useFormik } from 'formik';
import { addEnvironment } from 'providers/ReduxStore/slices/collections/actions';
import * as Yup from 'yup';
import { useDispatch } from 'react-redux';
import { SharedButton } from 'components/Environments/EnvironmentSettings';

const CreateEnvironment = ({ collection }) => {
  const dispatch = useDispatch();
  const inputRef = useRef();
  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      name: ''
    },
    validationSchema: Yup.object({
      name: Yup.string()
        .min(1, 'must be at least 1 character')
        .max(50, 'must be 50 characters or less')
        .required('name is required')
    }),
    onSubmit: (values) => {
      dispatch(addEnvironment(values.name, collection.uid))
        .then(() => {
          toast.success('Environment created in collection');
        })
        .catch(() => toast.error('An error occurred while created the environment'));
    }
  });

  useEffect(() => {
    if (inputRef && inputRef.current) {
      inputRef.current.focus();
    }
  }, [inputRef]);

  const onSubmit = () => {
    formik.handleSubmit();
  };

  return (
    <form className="bruno-form" onSubmit={formik.handleSubmit}>
      <div>
        <label htmlFor="name" className="block font-semibold">
          Environment Name
        </label>
        <div className="flex items-center mt-2">
          <input
            id="environment-name"
            type="text"
            name="name"
            ref={inputRef}
            className="block textbox w-full"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            onChange={formik.handleChange}
            value={formik.values.name || ''}
          />
          <SharedButton className="py-2.5 ml-1" onClick={onSubmit}>
            Create
          </SharedButton>
        </div>
        {formik.touched.name && formik.errors.name ? <div className="text-red-500">{formik.errors.name}</div> : null}
      </div>
    </form>
  );
};

export default CreateEnvironment;
