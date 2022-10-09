import React, { useRef, useEffect } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import Modal from 'components/Modal';

const CreateCollection = ({handleConfirm, handleCancel}) => {
  const inputRef = useRef();
  const formik = useFormik({
		enableReinitialize: true,
    initialValues: {
      collectionName: '',
      collectionLocation: ''
    },
    validationSchema: Yup.object({
      collectionName: Yup.string()
        .min(1, 'must be atleast 1 characters')
        .max(50, 'must be 50 characters or less')
        .required('name is required')
    }),
    onSubmit: (values) => {
      handleConfirm(values);
    }
  });

  useEffect(() => {
    if(inputRef && inputRef.current) {
      inputRef.current.focus();
    }
  }, [inputRef]);

  const onSubmit = () => formik.handleSubmit();

  return (
    <Modal
      size="sm"
      title='Create Collection'
      confirmText='Create'
      handleConfirm={onSubmit}
      handleCancel={handleCancel}
    >
      <form className="bruno-form" onSubmit={formik.handleSubmit}>
        <div>
          <label htmlFor="collectionName" className="block font-semibold">Name</label>
          <input
            id="collection-name"
            type="text"
            name="collectionName"
            ref={inputRef}
            className="block textbox mt-2 w-full"
            onChange={formik.handleChange}
            autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck="false"
            value={formik.values.collectionName || ''}
          />
          {formik.touched.collectionName && formik.errors.collectionName ? (
            <div className="text-red-500">{formik.errors.collectionName}</div>
          ) : null}
        </div>
      </form>
    </Modal>
  );
};

export default CreateCollection;
