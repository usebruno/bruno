import React, { useState } from 'react';
import {useFormik} from 'formik';
import * as Yup from 'yup';
import Modal from '../../Modal';

const CreateCollection = ({handleConfirm, handleCancel, actions, dispatch}) => {
  const formik = useFormik({
		enableReinitialize: true,
    initialValues: {
      collectionName: ''
    },
    validationSchema: Yup.object({
      collectionName: Yup.string()
        .min(3, 'must be atleast 3 characters')
        .max(50, 'must be 50 characters or less')
        .required('name is required')
    }),
    onSubmit: (values) => {
      handleConfirm(values);
    }
  });

  const onSubmit = () => formik.handleSubmit();

  return (
    <Modal
      size="sm"
      title='Create Collection'
      handleConfirm={onSubmit}
      handleCancel={handleCancel}
    >
      <form className="grafnode-form" onSubmit={formik.handleSubmit}>
        <div>
          <label htmlFor="collectionName" className="block font-semibold">Name</label>
          <input
            id="collection-name" type="text" name="collectionName"
            className="block textbox mt-2 w-full"
            onChange={formik.handleChange}
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
