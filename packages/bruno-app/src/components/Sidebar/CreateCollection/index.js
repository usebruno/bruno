import React, { useRef, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { browseDirectory } from 'providers/ReduxStore/slices/collections/actions';
import { createCollection } from 'providers/ReduxStore/slices/collections/actions';
import toast from 'react-hot-toast';
import Modal from 'components/Modal';
import { sanitizeName, validateName, validateNameError } from 'utils/common/regex';
import PathDisplay from 'components/PathDisplay/index';
import { useState } from 'react';
import { IconArrowBackUp, IconEdit } from '@tabler/icons';
import Help from 'components/Help';

const CreateCollection = ({ onClose }) => {
  const inputRef = useRef();
  const dispatch = useDispatch();
  const [isEditing, toggleEditing] = useState(false);

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      collectionName: '',
      collectionFolderName: '',
      collectionLocation: ''
    },
    validationSchema: Yup.object({
      collectionName: Yup.string()
        .min(1, 'must be at least 1 character')
        .max(255, 'must be 255 characters or less')
        .required('collection name is required'),
      collectionFolderName: Yup.string()
        .min(1, 'must be at least 1 character')
        .max(255, 'must be 255 characters or less')
        .test('is-valid-collection-name', function(value) {
          const isValid = validateName(value);
          return isValid ? true : this.createError({ message: validateNameError(value) });
        })
        .required('folder name is required'),
      collectionLocation: Yup.string().min(1, 'location is required').required('location is required')
    }),
    onSubmit: (values) => {
      dispatch(createCollection(values.collectionName, values.collectionFolderName, values.collectionLocation))
        .then(() => {
          toast.success('Collection created!');
          onClose();
        })
        .catch((e) => toast.error('An error occurred while creating the collection - ' + e));
    }
  });

  const browse = () => {
    dispatch(browseDirectory())
      .then((dirPath) => {
        // When the user closes the dialog without selecting anything dirPath will be false
        if (typeof dirPath === 'string') {
          formik.setFieldValue('collectionLocation', dirPath);
        }
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
    <Modal size="sm" title="Create Collection" confirmText="Create" handleConfirm={onSubmit} handleCancel={onClose}>
      <form className="bruno-form" onSubmit={e => e.preventDefault()}>
        <div>
          <label htmlFor="collection-name" className="flex items-center font-semibold">
            Name
          </label>
          <input
            id="collection-name"
            type="text"
            name="collectionName"
            ref={inputRef}
            className="block textbox mt-2 w-full"
            onChange={(e) => {
              formik.handleChange(e);
              !isEditing && formik.setFieldValue('collectionFolderName', sanitizeName(e.target.value));
            }}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            value={formik.values.collectionName || ''}
          />
          {formik.touched.collectionName && formik.errors.collectionName ? (
            <div className="text-red-500">{formik.errors.collectionName}</div>
          ) : null}

          <label htmlFor="collection-location" className="block font-semibold mt-3 flex items-center">
            Location
            <Help>
              <p>
                Bruno stores your collections on your computer's filesystem.
              </p>
              <p className="mt-2">
                Choose the location where you want to store this collection.
              </p>
            </Help>
          </label>
          <input
            id="collection-location"
            type="text"
            name="collectionLocation"
            readOnly={true}
            className="block textbox mt-2 w-full cursor-pointer"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            value={formik.values.collectionLocation || ''}
            onClick={browse}
          />
          {formik.touched.collectionLocation && formik.errors.collectionLocation ? (
            <div className="text-red-500">{formik.errors.collectionLocation}</div>
          ) : null}
          <div className="mt-1">
            <span
              className="text-link cursor-pointer hover:underline" onClick={browse}
              style={{
                fontSize: '0.8125rem'
              }}
            >
              Browse
            </span>
          </div>
          {formik.values.collectionName?.trim()?.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between">
                <label htmlFor="filename" className="flex items-center font-semibold">
                  Folder Name
                  <Help width="300">
                    <p>
                      The name of the folder used to store the collection.
                    </p>
                    <p className="mt-2">
                      You can choose a folder name different from your collection's name or one compatible with filesystem rules.
                    </p>
                  </Help>
                </label>
                {isEditing ? (
                  <IconArrowBackUp 
                    className="cursor-pointer opacity-50 hover:opacity-80" 
                    size={16} 
                    strokeWidth={1.5} 
                    onClick={() => toggleEditing(false)} 
                  />
                ) : (
                  <IconEdit
                    className="cursor-pointer opacity-50 hover:opacity-80" 
                    size={16} 
                    strokeWidth={1.5} 
                    onClick={() => toggleEditing(true)} 
                  />
                )}
              </div>
              {isEditing ? (
                <input
                  id="collection-folder-name"
                  type="text"
                  name="collectionFolderName"
                  className="block textbox mt-2 w-full"
                  onChange={formik.handleChange}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                  value={formik.values.collectionFolderName || ''}
                />
              ) : (
                <div className='relative flex flex-row gap-1 items-center justify-between'>
                  <PathDisplay
                    baseName={formik.values.collectionFolderName}
                  />
                </div>
              )}
              {formik.touched.collectionFolderName && formik.errors.collectionFolderName ? (
                <div className="text-red-500">{formik.errors.collectionFolderName}</div>
              ) : null}
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
};

export default CreateCollection;
