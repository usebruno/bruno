import React from 'react';
import toast from 'react-hot-toast';
import { useFormik } from 'formik';
import { useMutation } from '@tanstack/react-query';
import * as Yup from 'yup';
import Modal from 'components/Modal';
import { useDispatch } from 'react-redux';
import { isItemAFolder } from 'utils/tabs';
import { cloneItem } from 'providers/ReduxStore/slices/collections/actions';

const CloneCollectionItem = ({ collection, item, onClose }) => {
  const dispatch = useDispatch();
  const isFolder = isItemAFolder(item);

  const clone = useMutation({
    mutationFn: async (values) => {
      await dispatch(cloneItem(values.name, item.uid, collection.uid));
    },
    onSuccess: (_, values) => {
      onClose();
      toast.success(`Cloned "${item.name}" to "${values.name}"`);
    }
  });

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      name: item.name
    },
    validationSchema: Yup.object({
      name: Yup.string()
        .trim()
        .min(1, 'Name must be at least 1 character')
        .max(250, 'Name must be 250 characters or less')
        .required('Name is required')
    }),
    onSubmit: (values) => {
      clone.mutate(values);
    }
  });

  return (
    <Modal
      size="sm"
      title={`Clone "${item.name}"`}
      confirmText="Clone"
      errorMessage={clone.isError ? clone.error.message : null}
      handleConfirm={() => formik.handleSubmit()}
      handleCancel={onClose}
    >
      <form className="bruno-form" onSubmit={formik.handleSubmit}>
        <div>
          <label htmlFor="name" className="block font-semibold">
            {isFolder ? 'Folder' : 'Request'} Name
          </label>
          <input
            autoFocus
            id="collection-item-name"
            type="text"
            name="name"
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
