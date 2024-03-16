import React from 'react';
import { useFormik } from 'formik';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import * as Yup from 'yup';
import Modal from 'components/Modal';
import { useDispatch } from 'react-redux';
import { isItemAFolder } from 'utils/tabs';
import { renameItem } from 'providers/ReduxStore/slices/collections/actions';
import { dirnameRegex } from 'utils/common/regex';

const RenameCollectionItem = ({ collection, item, onClose }) => {
  const dispatch = useDispatch();
  const isFolder = isItemAFolder(item);

  const rename = useMutation({
    mutationFn: async (values) => {
      await dispatch(renameItem(values.name, item.uid, collection.uid));
    },
    onSuccess: (_, values) => {
      onClose();
      toast.success(`Renamed from "${item.name}" to "${values.name}"`);
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
        .min(1, 'Name must be at least 1 character long')
        .max(250, 'Name must be 250 characters or less')
        .matches(isFolder ? dirnameRegex : /.*/g, 'Name contains invalid characters')
        .required('Name is required')
    }),
    onSubmit: (values) => {
      rename.mutate(values);
    }
  });

  return (
    <Modal
      size="sm"
      title={`Rename "${item.name}"`}
      confirmText="Rename"
      errorMessage={rename.isError ? String(rename.error) : null}
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

export default RenameCollectionItem;
