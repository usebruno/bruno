import React, { useEffect, useRef } from 'react';
import Portal from 'components/Portal';
import Modal from 'components/Modal';
import toast from 'react-hot-toast';
import { useFormik } from 'formik';
import { addEnvironment } from 'providers/ReduxStore/slices/collections/actions';
import * as Yup from 'yup';
import { useDispatch } from 'react-redux';

const CreateEnvironment = ({ collection, onClose }) => {
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
        .max(250, 'must be 250 characters or less')
        .required('name is required')
    }),
    onSubmit: (values) => {
      dispatch(addEnvironment(values.name, collection.uid))
        .then(() => {
          toast.success('Environment created in collection');
          onClose();
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
    <Portal>
      <Modal
        size="sm"
        title={'Create Environment'}
        confirmText="Create"
        handleConfirm={onSubmit}
        handleCancel={onClose}
      >
        <form className="bruno-form" onSubmit={formik.handleSubmit}>
          <div>
            <label htmlFor="name" className="block font-semibold">
              Environment Name
            </label>
            <input
              id="environment-name"
              type="text"
              name="name"
              ref={inputRef}
              className="block textbox mt-2 w-full"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              onChange={formik.handleChange}
              value={formik.values.name || ''}
            />
            {formik.touched.name && formik.errors.name ? (
              <div className="text-red-500">{formik.errors.name}</div>
            ) : null}
          </div>
        </form>
      </Modal>
    </Portal>
  );
};

export default CreateEnvironment;
