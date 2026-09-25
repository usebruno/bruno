import React from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import Modal from 'components/Modal';
import { useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import { cloneApiSpec } from 'providers/ReduxStore/slices/apiSpec';
import { browseDirectory } from 'providers/ReduxStore/slices/collections/actions';
import { sanitizeName, validateName, validateNameError } from 'utils/common/regex';

const CloneApiSpecForm = ({ apiSpec, defaultLocation, onClose }) => {
  const dispatch = useDispatch();

  const formik = useFormik({
    initialValues: {
      name: sanitizeName(`${apiSpec.name} copy`),
      location: defaultLocation
    },
    validationSchema: Yup.object({
      name: Yup.string()
        .trim()
        .min(1, 'must be at least 1 character')
        .max(255, 'must be 255 characters or less')
        .test('is-valid-filename', function (value) {
          return validateName(value) ? true : this.createError({ message: validateNameError(value) });
        })
        .required('name is required'),
      location: Yup.string().min(1, 'location is required').required('location is required')
    }),
    onSubmit: (values) => {
      dispatch(cloneApiSpec({ uid: apiSpec.uid, name: values.name.trim(), location: values.location }))
        .then(() => {
          toast.success('API Spec cloned');
          onClose();
        })
        .catch((err) => {
          toast.error(err?.message || 'An error occurred while cloning the API Spec');
        });
    }
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

  const onSubmit = () => formik.handleSubmit();

  return (
    <Modal
      size="md"
      title="Clone API Spec"
      confirmText="Clone"
      handleConfirm={onSubmit}
      handleCancel={onClose}
      dataTestId="clone-api-spec-modal"
    >
      <form className="bruno-form" onSubmit={(e) => e.preventDefault()}>
        <div>
          <label htmlFor="api-spec-clone-name" className="flex items-center font-medium">
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
            value={formik.values.name || ''}
          />
          {formik.touched.name && formik.errors.name ? <div className="text-red-500">{formik.errors.name}</div> : null}

          <label htmlFor="api-spec-clone-location" className="block font-medium mt-3">
            Location
          </label>
          <input
            id="api-spec-clone-location"
            type="text"
            name="location"
            data-testid="clone-api-spec-location"
            readOnly={true}
            className="block textbox mt-2 w-full cursor-pointer"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            value={formik.values.location || ''}
            onClick={browse}
          />
          {formik.touched.location && formik.errors.location ? (
            <div className="text-red-500">{formik.errors.location}</div>
          ) : null}
          <div className="mt-1">
            <span className="text-link cursor-pointer hover:underline" onClick={browse} data-testid="clone-api-spec-browse">
              Browse
            </span>
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default CloneApiSpecForm;
