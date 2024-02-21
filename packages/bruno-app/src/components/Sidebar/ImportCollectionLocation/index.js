import React, { useRef, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { browseDirectory } from 'providers/ReduxStore/slices/collections/actions';
import Modal from 'components/Modal';
import { Input } from 'components/ui/input';
import { Button } from 'components/ui/button';

const ImportCollectionLocation = ({ onClose, handleSubmit, collectionName }) => {
  const inputRef = useRef();
  const dispatch = useDispatch();

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      collectionLocation: ''
    },
    validationSchema: Yup.object({
      collectionLocation: Yup.string()
        .min(1, 'must be at least 1 character')
        .max(500, 'must be 500 characters or less')
        .required('name is required')
    }),
    onSubmit: (values) => {
      handleSubmit(values.collectionLocation);
    }
  });

  const browse = () => {
    dispatch(browseDirectory())
      .then((dirPath) => {
        formik.setFieldValue('collectionLocation', dirPath);
      })
      .catch((error) => {
        formik.setFieldValue('collectionLocation', '');
        console.error(error);
      });
  };

  useEffect(() => {
    if (inputRef && inputRef.current) {
      inputRef.current.focus();
    }
  }, [inputRef]);

  const onSubmit = () => formik.handleSubmit();

  return (
    <Modal
      size="sm"
      title="Import Collection"
      confirmText="Import"
      handleConfirm={onSubmit} handleCancel={onClose}>
      <form className="bruno-form" onSubmit={formik.handleSubmit}>
        <div>
          <label htmlFor="collectionName" className="block font-semibold">
            Name
          </label>
          <div className="mt-2">{collectionName}</div>

          <>
            <label htmlFor="collectionLocation" className="block font-semibold mt-3">
              Location
            </label>
            <div className="flex w-full max-w-sm items-center space-x-2 mt-1">
            <Input
              id="collection-location"
              type="text"
              name="collectionLocation"
              readOnly={true}
              placeholder="Select a location"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              value={formik.values.collectionLocation || ''}
              onClick={browse}
            />
              <Button onClick={browse}>Browse</Button>
            </div>
          </>
          {formik.touched.collectionLocation && formik.errors.collectionLocation ? (
            <div className="text-red-500">{formik.errors.collectionLocation}</div>
          ) : null}
        </div>
      </form>
    </Modal>
  );
};

export default ImportCollectionLocation;
