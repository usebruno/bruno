import React, { useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import Modal from 'components/Modal';
import { useDispatch } from 'react-redux';
import { isItemAFolder } from 'utils/tabs';
import { cloneItem } from 'providers/ReduxStore/slices/collections/actions';

const CloneCollectionItem = ({ collection, item, onClose }) => {
  const dispatch = useDispatch();
  const isFolder = isItemAFolder(item);
  const inputRef = useRef();
  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      name: item.name
    },
    validationSchema: Yup.object({
      name: Yup.string()
        .min(1, 'must be at least 1 character')
        .max(50, 'must be 50 characters or less')
        .required('name is required')
    }),
    onSubmit: (values) => {
      dispatch(cloneItem(values.name, item.uid, collection.uid))
        .then(() => {
          toast.success('Request cloned!');
          onClose();
        })
        .catch((err) => {
          toast.error(err ? err.message : 'An error occurred while cloning the request');
        });
    }
  });

  useEffect(() => {
    if (inputRef && inputRef.current) {
      inputRef.current.focus();
    }
  }, [inputRef]);

  const onSubmit = () => formik.handleSubmit();

  return (
    <Modal
      size="sm"
      title={`Clone ${isFolder ? 'Folder' : 'Request'}`}
      confirmText="Clone"
      handleConfirm={onSubmit}
      handleCancel={onClose}
    >
      <form className="bruno-form" onSubmit={e => e.preventDefault()}>
        <div>
          <label htmlFor="name" className="block font-semibold">
            {isFolder ? 'Folder' : 'Request'} Name
          </label>
          <input
            id="collection-item-name"
            type="text"
            name="name"
            placeholder='Enter Item name'
            ref={inputRef}
            className="block textbox mt-2 w-full"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            onChange={formik.handleChange}
            value={formik.values.name || ''}
          />
          {formik.touched.name && formik.errors.name ? <div className="text-red-500">{formik.errors.name}</div> : null}
        </div>
      </form>
    </Modal>
  );
};

export default CloneCollectionItem;
