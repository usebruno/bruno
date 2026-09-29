import React from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import toast from 'react-hot-toast';
import { useDispatch } from 'react-redux';
import Modal from 'components/Modal';
import SpecLocationField from 'components/Sidebar/ApiSpecs/SpecLocationField';
import { cloneApiSpec } from 'providers/ReduxStore/slices/apiSpec';
import { browseDirectory } from 'providers/ReduxStore/slices/collections/actions';
import useDefaultApiSpecLocation from 'hooks/useDefaultApiSpecLocation';
import { formatIpcError } from 'utils/common/error';
import { sanitizeName, validateName, validateNameError } from 'utils/common/regex';

const CloneApiSpec = ({ apiSpec, onClose }) => {
  const dispatch = useDispatch();
  const defaultLocation = useDefaultApiSpecLocation();

  const formik = useFormik({
    initialValues: {
      name: sanitizeName(`${apiSpec.name} copy`),
      location: ''
    },
    validationSchema: Yup.object({
      name: Yup.string()
        .trim()
        .max(255, 'must be 255 characters or less')
        .test('is-valid-filename', function (value) {
          return validateName(value) ? true : this.createError({ message: validateNameError(value) });
        })
        .required('name is required'),
      location: Yup.string().test('has-location', 'location is required', (value) => Boolean(value || defaultLocation))
    }),
    onSubmit: (values) =>
      dispatch(cloneApiSpec({ uid: apiSpec.uid, name: values.name.trim(), location: values.location || defaultLocation }))
        .then(() => {
          toast.success('API Spec cloned');
          onClose();
        })
        .catch((err) => toast.error(formatIpcError(err) || 'An error occurred while cloning the API Spec'))
  });

  const browse = () => {
    dispatch(browseDirectory())
      .then((dirPath) => {
        if (typeof dirPath === 'string') {
          formik.setFieldValue('location', dirPath);
        }
      })
      .catch((error) => console.error(error));
  };

  return (
    <Modal
      size="md"
      title="Clone API Spec"
      confirmText="Clone"
      confirmDisabled={formik.isSubmitting}
      handleConfirm={formik.handleSubmit}
      handleCancel={onClose}
      dataTestId="clone-api-spec-modal"
    >
      <form className="bruno-form" onSubmit={(e) => e.preventDefault()}>
        <label htmlFor="api-spec-clone-name" className="block font-semibold">
          Name
        </label>
        <input
          id="api-spec-clone-name"
          type="text"
          name="name"
          data-testid="clone-api-spec-name"
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

        <SpecLocationField
          location={formik.values.location || defaultLocation}
          error={formik.touched.location ? formik.errors.location : ''}
          onBrowse={browse}
        />
      </form>
    </Modal>
  );
};

export default CloneApiSpec;
