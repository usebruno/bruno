import React from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import toast from 'react-hot-toast';
import { useDispatch, useSelector } from 'react-redux';
import Modal from 'components/Modal';
import { newApp } from 'providers/ReduxStore/slices/collections/actions';
import { sanitizeName, validateName, validateNameError } from 'utils/common/regex';

const NewApp = ({ collectionUid, item, onClose }) => {
  const dispatch = useDispatch();

  const collection = useSelector((state) =>
    state.collections.collections?.find((c) => c.uid === collectionUid)
  );

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: { appName: '' },
    validationSchema: Yup.object({
      appName: Yup.string()
        .trim()
        .min(1, 'App name is required')
        .max(255, 'Must be 255 characters or less')
        .test('valid-name', validateNameError, (value) => validateName(value || ''))
        .required('App name is required')
    }),
    onSubmit: (values) => {
      const name = values.appName.trim();
      dispatch(
        newApp({
          appName: name,
          filename: sanitizeName(name),
          collectionUid,
          itemUid: item ? item.uid : null
        })
      )
        .then(() => {
          toast.success('App created');
          onClose();
        })
        .catch((err) => toast.error(err?.message || 'Failed to create app'));
    }
  });

  const onSubmit = () => formik.handleSubmit();

  return (
    <Modal
      size="sm"
      title="New App"
      confirmText="Create"
      handleConfirm={onSubmit}
      handleCancel={onClose}
      disableEscapeKey={false}
      disableCloseOnOutsideClick={false}
    >
      <form className="bruno-form" onSubmit={formik.handleSubmit} data-testid="new-app-form">
        <label htmlFor="appName" className="block font-semibold">
          Name
        </label>
        <input
          id="appName"
          type="text"
          name="appName"
          data-testid="new-app-name-input"
          autoFocus
          autoComplete="off"
          spellCheck="false"
          className="block textbox mt-2 w-full"
          value={formik.values.appName}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
        />
        {formik.touched.appName && formik.errors.appName ? (
          <div className="text-red-500 text-xs mt-1">{formik.errors.appName}</div>
        ) : (
          <div className="text-xs mt-2 opacity-70">
            Creates a standalone app file in {item ? 'this folder' : `collection "${collection?.name || ''}"`}.
          </div>
        )}
      </form>
    </Modal>
  );
};

export default NewApp;
