import React, { useRef, useEffect } from 'react';
import {useFormik} from 'formik';
import * as Yup from 'yup';
import Modal from 'components/Modal';
import { useDispatch } from 'react-redux';
import { newFolder } from 'providers/ReduxStore/slices/collections';

const NewFolder = ({collectionUid, handleCancel, handleClose}) => {
  const dispatch = useDispatch();
  const inputRef = useRef();
  const formik = useFormik({
		enableReinitialize: true,
    initialValues: {
      folderName: ''
    },
    validationSchema: Yup.object({
      folderName: Yup.string()
        .min(1, 'must be atleast 1 characters')
        .max(50, 'must be 50 characters or less')
        .required('name is required')
    }),
    onSubmit: (values) => {
      dispatch(newFolder(values.folderName, collectionUid));
      handleClose();
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
      title='New Folder'
      confirmText='Create'
      handleConfirm={onSubmit}
      handleCancel={handleCancel}
    >
      <form className="grafnode-form" onSubmit={formik.handleSubmit}>
        <div>
          <label htmlFor="folderName" className="block font-semibold">Folder Name</label>
          <input
            id="collection-name" type="text" name="folderName"
            ref={inputRef}
            className="block textbox mt-2 w-full"
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
