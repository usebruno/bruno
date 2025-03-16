import React, { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import Modal from 'components/Modal';
import { useDispatch } from 'react-redux';
import { isItemAFolder } from 'utils/tabs';
import { cloneItem } from 'providers/ReduxStore/slices/collections/actions';
import { IconArrowBackUp, IconEdit } from "@tabler/icons";
import { sanitizeName, validateName, validateNameError } from 'utils/common/regex';
import Help from 'components/Help';
import PathDisplay from 'components/PathDisplay/index';
import path from 'utils/common/path';

const CloneCollectionItem = ({ collection, item, onClose }) => {
  const dispatch = useDispatch();
  const isFolder = isItemAFolder(item);
  const inputRef = useRef();
  const [isEditing, toggleEditing] = useState(false);
  const itemName = item?.name;
  const itemType = item?.type;
  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      name: `${itemName} copy`,
      filename: `${sanitizeName(itemName)} copy`
    },
    validationSchema: Yup.object({
      name: Yup.string()
        .min(1, 'must be at least 1 character')
        .max(255, 'must be 255 characters or less')
        .required('name is required'),
      filename: Yup.string()
        .min(1, 'must be at least 1 character')
        .max(255, 'must be 255 characters or less')
        .required('name is required')
        .test('is-valid-name', function(value) {
          const isValid = validateName(value);
          return isValid ? true : this.createError({ message: validateNameError(value) });
        })
        .test('not-reserved', `The file names "collection" and "folder" are reserved in bruno`, value => !['collection', 'folder'].includes(value))
    }),
    onSubmit: (values) => {
      dispatch(cloneItem(values.name, values.filename, item.uid, collection.uid))
        .then(() => {
          toast.success('Request cloned!');
          onClose();
        })
        .catch((err) => {
          toast.error(err ? err.message : 'An error occurred while cloning the request');
        });
    }
  });

  useEffect(() => {
    if (inputRef && inputRef.current) {
      inputRef.current.focus();
    }
  }, [inputRef]);

  const onSubmit = () => formik.handleSubmit();

  return (
    <Modal
      size="md"
      title={`Clone ${isFolder ? 'Folder' : 'Request'}`}
      confirmText="Clone"
      handleConfirm={onSubmit}
      handleCancel={onClose}
    >
      <form className="bruno-form" onSubmit={e => e.preventDefault()}>
        <div>
          <label htmlFor="name" className="block font-semibold">
            Name
          </label>
          <input
            id="collection-item-name"
            type="text"
            name="name"
            placeholder='Enter Item name'
            ref={inputRef}
            className="block textbox mt-2 w-full"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            onChange={e => {
              formik.setFieldValue('name', e.target.value);
              !isEditing && formik.setFieldValue('filename', sanitizeName(e.target.value));
            }}
            value={formik.values.name || ''}
          />
          {formik.touched.name && formik.errors.name ? <div className="text-red-500">{formik.errors.name}</div> : null}
        </div>
        <div className="mt-4">
          <div className="flex items-center justify-between">
            <label htmlFor="filename" className="flex items-center font-semibold">
              {isFolder ? 'Folder' : 'File'} Name
              { isFolder ? (
                <Help width="300">
                  <p>
                    Bruno stores folders in the UI as folders on your filesystem.
                  </p>
                  <p className="mt-2">
                    You can specify a custom folder name if you'd prefer a different name or need one compatible with filesystem rules.
                  </p>
                </Help>
              ) : (
                <Help width="300">
                  <p>
                    Bruno saves each request as a file in your collection's folder.
                  </p>
                  <p className="mt-2">
                    You can choose a file name different from your request's name or one compatible with filesystem rules.
                  </p>
                </Help>
              )}
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
            <div className='relative flex flex-row gap-1 items-center justify-between'>
              <input
                id="file-name"
                type="text"
                name="filename"
                placeholder={isFolder ? 'Folder Name' : 'File Name'}
                className={`!pr-10 block textbox mt-2 w-full`}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                onChange={formik.handleChange}
                value={formik.values.filename || ''}
              />
              {itemType !== 'folder' && <span className='absolute right-2 top-4 flex justify-center items-center file-extension'>.bru</span>}
            </div>
          ) : (
            <div className='relative flex flex-row gap-1 items-center justify-between'>
              <PathDisplay
                collection={collection}
                dirName={path.relative(collection?.pathname, path.dirname(item?.pathname))}
                baseName={formik.values.filename}
              />
            </div>
          )}
          {formik.touched.filename && formik.errors.filename ? (
            <div className="text-red-500">{formik.errors.filename}</div>
          ) : null}
        </div>
      </form>
    </Modal>
  );
};

export default CloneCollectionItem;
