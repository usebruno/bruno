import React from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import toast from 'react-hot-toast';
import { useDispatch } from 'react-redux';
import Modal from 'components/Modal';
import { renameApiSpec } from 'providers/ReduxStore/slices/apiSpec';
import { formatIpcError } from 'utils/common/error';

const RenameApiSpec = ({ apiSpec, onClose }) => {
  const dispatch = useDispatch();

  const formik = useFormik({
    initialValues: {
      name: apiSpec.name || ''
    },
    validationSchema: Yup.object({
      name: Yup.string().trim().required('name is required')
    }),
    onSubmit: (values) =>
      dispatch(renameApiSpec({ uid: apiSpec.uid, newName: values.name.trim() }))
        .then(() => {
          toast.success('API Spec renamed');
          onClose();
        })
        .catch((err) => toast.error(formatIpcError(err) || 'An error occurred while renaming the API Spec'))
  });

  return (
    <Modal
      size="sm"
      title="Rename API Spec"
      confirmText="Rename"
      confirmDisabled={formik.isSubmitting}
      handleConfirm={formik.handleSubmit}
      handleCancel={onClose}
      dataTestId="rename-api-spec-modal"
    >
      <form className="bruno-form" onSubmit={(e) => e.preventDefault()}>
        <label htmlFor="api-spec-name" className="block font-semibold">
          Name
        </label>
        <input
          id="api-spec-name"
          type="text"
          name="name"
          data-testid="rename-api-spec-name"
          className="block textbox mt-2 w-full"
          autoFocus
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
          onChange={formik.handleChange}
          value={formik.values.name}
        />
        {formik.touched.name && formik.errors.name ? <div className="text-red-500">{formik.errors.name}</div> : null}
      </form>
    </Modal>
  );
};

export default RenameApiSpec;
