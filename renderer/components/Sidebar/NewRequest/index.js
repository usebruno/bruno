import React, { useRef, useEffect } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import Modal from 'components/Modal';
import { useDispatch } from 'react-redux';
import { newHttpRequest } from 'providers/ReduxStore/slices/collections';
import { addTab } from 'providers/ReduxStore/slices/tabs';

const NewRequest = ({collection, item, onClose}) => {
  const dispatch = useDispatch();
  const inputRef = useRef();
  const formik = useFormik({
		enableReinitialize: true,
    initialValues: {
      requestName: ''
    },
    validationSchema: Yup.object({
      requestName: Yup.string()
        .min(1, 'must be atleast 1 characters')
        .max(50, 'must be 50 characters or less')
        .required('name is required')
    }),
    onSubmit: (values) => {
      dispatch(newHttpRequest(values.requestName, collection.uid, item ? item.uid : null))
        .then((action) => {
          dispatch(addTab({
            uid: action.payload.item.uid,
            collectionUid: collection.uid
          }));
        });
      onClose();
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
      title='New Request'
      confirmText='Create'
      handleConfirm={onSubmit}
      handleCancel={onClose}
    >
      <form className="grafnode-form" onSubmit={formik.handleSubmit}>
        <div>
          <label htmlFor="requestName" className="block font-semibold">Request Name</label>
          <input
            id="collection-name" type="text" name="requestName"
            ref={inputRef}
            className="block textbox mt-2 w-full"
            onChange={formik.handleChange}
            value={formik.values.requestName || ''}
          />
          {formik.touched.requestName && formik.errors.requestName ? (
            <div className="text-red-500">{formik.errors.requestName}</div>
          ) : null}
        </div>
      </form>
    </Modal>
  );
};

export default NewRequest;
