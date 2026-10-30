import React from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import toast from 'react-hot-toast';
import { useDispatch } from 'react-redux';
import Modal from 'components/Modal';
import SpecLocationField from 'components/Sidebar/ApiSpecs/SpecLocationField';
import ApiSpecWarnings from 'components/Sidebar/ApiSpecs/ApiSpecWarnings';
import { cloneApiSpec } from 'providers/ReduxStore/slices/apiSpec';
import { browseDirectory } from 'providers/ReduxStore/slices/collections/actions';
import useDefaultApiSpecLocation from 'hooks/useDefaultApiSpecLocation';
import { formatIpcError } from 'utils/common/error';
import path from 'utils/common/path';
import { getApiSpecPathKey, hasUnsavedApiSpecChanges } from 'utils/api-specs';
import { sanitizeName, validateName, validateNameError } from 'utils/common/regex';

const MAX_FILENAME_LENGTH = 255;

const CloneApiSpec = ({ apiSpec, onClose }) => {
  const dispatch = useDispatch();
  const workspaceLocation = useDefaultApiSpecLocation();
  const sourceFolder = path.dirname(apiSpec.pathname);
  const usesOtherFiles = Boolean(apiSpec.resolvedJson);
  const defaultLocation = usesOtherFiles ? sourceFolder : workspaceLocation;
  const maxNameLength = MAX_FILENAME_LENGTH - path.extname(apiSpec.pathname).length;

  const formik = useFormik({
    initialValues: {
      name: sanitizeName(`${apiSpec.name} copy`),
      location: ''
    },
    validationSchema: Yup.object({
      name: Yup.string()
        .trim()
        .max(maxNameLength, `must be ${maxNameLength} characters or less`)
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

  const location = formik.values.location || defaultLocation;
  const warnings = [
    ...(usesOtherFiles && getApiSpecPathKey(location) !== getApiSpecPathKey(sourceFolder)
      ? [{
          testId: 'api-spec-relative-refs-warning',
          message: 'This spec uses other files through relative references, and only this file is copied. Clone it into the same folder to keep those references working.'
        }]
      : []),
    ...(hasUnsavedApiSpecChanges(apiSpec)
      ? [{
          testId: 'api-spec-unsaved-warning',
          message: 'You have unsaved changes in this spec. The clone is made from the saved file, so those changes will not be included.'
        }]
      : [])
  ];

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
        {formik.touched.name && formik.errors.name ? (
          <div className="text-red-500" data-testid="clone-api-spec-name-error">{formik.errors.name}</div>
        ) : null}

        <SpecLocationField
          location={location}
          error={formik.touched.location ? formik.errors.location : ''}
          onBrowse={browse}
        />
        <ApiSpecWarnings warnings={warnings} />
      </form>
    </Modal>
  );
};

export default CloneApiSpec;
