import React, { useRef, useEffect } from 'react';
import { useFormik } from 'formik';
import toast from 'react-hot-toast';
import * as Yup from 'yup';
import Modal from 'components/Modal';
import { useDispatch } from 'react-redux';
import { newFolder } from 'providers/ReduxStore/slices/collections/actions';

const NewFolder = ({ collection, item, onClose }) => {
  const dispatch = useDispatch();
  const inputRef = useRef();
  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      folderName: ''
    },
    validationSchema: Yup.object({
      folderName: Yup.string()
        .trim()
        .min(1, 'must be at least 1 character')
        .required('name is required')
        .test({
          name: 'folderName',
          message: 'The folder name "environments" at the root of the collection is reserved in bruno',
          test: (value) => {
            if (item && item.uid) {
              return true;
            }
            return value && !value.trim().toLowerCase().includes('environments');
          }
        })
    }),
    onSubmit: (values) => {
      dispatch(newFolder(values.folderName, collection.uid, item ? item.uid : null))
        .then(() => {
          toast.success('New folder created!');
          onClose()
        })
        .catch((err) => toast.error(err ? err.message : 'An error occurred while adding the folder'));
    }
  });

  useEffect(() => {
    if (inputRef && inputRef.current) {
      inputRef.current.focus();
    }
  }, [inputRef]);

  const onSubmit = () => formik.handleSubmit();

  return (
    <Modal size="sm" title="New Folder" confirmText="Create" handleConfirm={onSubmit} handleCancel={onClose}>
      <form className="bruno-form" onSubmit={e => e.preventDefault()}>
        <div>
          <label htmlFor="folderName" className="block font-semibold">
            Folder Name
          </label>
          <input
            id="collection-name"
            type="text"
            name="folderName"
            ref={inputRef}
            className="block textbox mt-2 w-full"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            onChange={formik.handleChange}
            value={formik.values.folderName || ''}
          />
          {formik.touched.folderName && formik.errors.folderName ? (
            <div className="text-red-500">{formik.errors.folderName}</div>
          ) : null}
        </div>
      </form>
    </Modal>
  );
};

export default NewFolder;
