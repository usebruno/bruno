import React, { useState, useRef, useEffect, forwardRef } from 'react';
import toast from 'react-hot-toast';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import Modal from 'components/Modal';
import { useDispatch } from 'react-redux';
import { isItemAFolder } from 'utils/tabs';
import { cloneItem } from 'providers/ReduxStore/slices/collections/actions';
import { IconArrowBackUp, IconEdit, IconCaretDown } from "@tabler/icons";
import { sanitizeName, validateName, validateNameError } from 'utils/common/regex';
import Help from 'components/Help';
import PathDisplay from 'components/PathDisplay/index';
import path from 'utils/common/path';
import Portal from 'components/Portal';
import Dropdown from 'components/Dropdown';
import StyledWrapper from './StyledWrapper';

const CloneCollectionItem = ({ collection, item, onClose }) => {
  const dispatch = useDispatch();
  const isFolder = isItemAFolder(item);
  const inputRef = useRef();
  const [isEditing, toggleEditing] = useState(false);
  const itemName = item?.name;
  const itemType = item?.type;
  const [showFilesystemName, toggleShowFilesystemName] = useState(false);

  const dropdownTippyRef = useRef();
  const onDropdownCreate = (ref) => (dropdownTippyRef.current = ref);

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

  const AdvancedOptions = forwardRef((props, ref) => {
    return (
      <div ref={ref} className="flex mr-2 text-link cursor-pointer items-center">
        <button
          className="btn-advanced"
          type="button"
        >
          Advanced
        </button>
        <IconCaretDown className="caret ml-1" size={14} strokeWidth={2}/>
      </div>
    );
  });

  return (
    <Portal>
      <StyledWrapper>
        <Modal
          size="md"
          title={`Clone ${isFolder ? 'Folder' : 'Request'}`}
          handleCancel={onClose}
          hideFooter
        >
          <form className="bruno-form" onSubmit={formik.handleSubmit}>
            <div>
              <label htmlFor="name" className="block font-semibold">
                {isFolder ? 'Folder' : 'Request'} Name
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
            
            {showFilesystemName && (
              <div className="mt-4">
                <div className="flex items-center justify-between">
                  <label htmlFor="filename" className="flex items-center font-semibold">
                    {isFolder ? 'Folder' : 'File'} Name <small className='font-normal text-muted ml-1'>(on filesystem)</small>
                    { isFolder ? (
                      <Help width="300">
                        <p>
                          You can choose to save the folder as a different name on your file system versus what is displayed in the app.
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
            )}

            <div className="flex justify-between items-center mt-8 bruno-modal-footer">
              <div className='flex advanced-options'>
                <Dropdown onCreate={onDropdownCreate} icon={<AdvancedOptions />} placement="bottom-start">
                  <div 
                    className="dropdown-item"
                    key="show-filesystem-name"
                    onClick={(e) => {
                      dropdownTippyRef.current.hide();
                      toggleShowFilesystemName(!showFilesystemName);
                    }}
                  >
                    {showFilesystemName ? 'Hide Filesystem Name' : 'Show Filesystem Name'}
                  </div>
                </Dropdown>
              </div>
              <div className='flex justify-end'>
                <span className='mr-2'>
                  <button type="button" onClick={onClose} className="btn btn-md btn-close">
                    Cancel
                  </button>
                </span>
                <span>
                  <button
                    type="submit"
                    className="submit btn btn-md btn-secondary"
                  >
                    Clone
                  </button>
                </span>
              </div>
            </div>
          </form>
        </Modal>
      </StyledWrapper>
    </Portal>
  );
};

export default CloneCollectionItem;
