import React from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import Modal from 'components/Modal';
import { useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import { renameApiSpec } from 'providers/ReduxStore/slices/apiSpec';

const RenameApiSpec = ({ apiSpec, onClose }) => {
  const dispatch = useDispatch();
  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      name: apiSpec.name
    },
    validationSchema: Yup.object({
      name: Yup.string()
        .trim()
        .min(1, 'must be at least 1 character')
        .required('name is required')
    }),
    onSubmit: (values) => {
      dispatch(renameApiSpec({ uid: apiSpec.uid, newName: values.name.trim() }))
        .then(() => {
          toast.success('API Spec renamed');
          onClose();
        })
        .catch((err) => {
          toast.error(err?.message || 'An error occurred while renaming the API Spec');
        });
    }
  });

  const onSubmit = () => formik.handleSubmit();

  return (
    <Modal
      size="md"
      title="Rename API Spec"
      confirmText="Rename"
      handleConfirm={onSubmit}
      handleCancel={onClose}
      dataTestId="rename-api-spec-modal"
    >
      <form className="bruno-form" onSubmit={(e) => e.preventDefault()}>
        <div>
          <label htmlFor="api-spec-name" className="block font-medium">
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
            value={formik.values.name || ''}
          />
          {formik.touched.name && formik.errors.name ? <div className="text-red-500">{formik.errors.name}</div> : null}
        </div>
      </form>
    </Modal>
  );
};

export default RenameApiSpec;
