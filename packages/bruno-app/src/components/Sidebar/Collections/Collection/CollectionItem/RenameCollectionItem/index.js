import React, { useRef, useEffect, useState } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import Modal from 'components/Modal';
import { useDispatch } from 'react-redux';
import { isItemAFolder } from 'utils/tabs';
import { renameItem, saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import path from 'path';
import { IconEdit, IconFile } from '@tabler/icons';
import StyledWrapper from './StyledWrapper';
import { sanitizeName, validateName, validateNameError } from 'utils/common/regex';
import toast from 'react-hot-toast';
import { closeTabs } from 'providers/ReduxStore/slices/tabs';

const RenameCollectionItem = ({ collection, item, onClose }) => {
  const dispatch = useDispatch();
  const isFolder = isItemAFolder(item);
  const inputRef = useRef();
  const [isEditingFilename, toggleEditingFilename] = useState(false);
  const itemName = item?.name;
  const itemType = item?.type;
  const itemFilename = item?.filename ? path.parse(item?.filename).name : '';
  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      name: itemName,
      filename: sanitizeName(itemFilename)
    },
    validationSchema: Yup.object({
      name: Yup.string()
        .min(1, 'must be at least 1 character')
        .max(50, 'must be 50 characters or less')
        .required('name is required'),
      filename: Yup.string()
        .min(1, 'must be at least 1 character')
        .max(50, 'must be 50 characters or less')
        .required('name is required')
        .test('is-valid-filename', function(value) {
          const isValid = validateName(value);
          return isValid ? true : this.createError({ message: validateNameError(value) });
        })
        .test('not-reserved', `The file names "collection" and "folder" are reserved in bruno`, value => !['collection', 'folder'].includes(value))
    }),
    onSubmit: async (values) => {
      // if there is unsaved changes in the request,
      // save them before renaming the request
      if ((item.name === values.name) && (itemFilename === values.filename)) {
        return;
      }
      if (!isFolder && item.draft) {
        await dispatch(saveRequest(item.uid, collection.uid, true));
      }
      const { name: newName, filename: newFilename } = values;
      try {
        let renameConfig = {
          itemUid: item.uid,
          collectionUid: collection.uid,
        };
        renameConfig['newName'] = newName;
        if (itemFilename !== newFilename) {
          renameConfig['newFilename'] = newFilename;
        }
        await dispatch(renameItem(renameConfig));
        if (isFolder) {
          dispatch(closeTabs({ tabUids: [item.uid] }));
        }
        onClose();
      } catch (error) {
        toast.error(error.message || 'An error occurred while renaming');
      }
    }
  });

  useEffect(() => {
    if (inputRef && inputRef.current) {
      inputRef.current.focus();
    }
  }, [inputRef]);

  const onSubmit = () => formik.handleSubmit();

  const filename = formik.values.filename;
  const name = formik.values.name;
  const doNamesDiffer = filename !== name;

  const filenameFooter = !isEditingFilename && filename ?
    <div className={`flex flex-row gap-2 items-center w-full h-full`}>
      <p className={`cursor-default whitespace-nowrap overflow-hidden text-ellipsis max-w-64 ${doNamesDiffer? 'highlight': 'opacity-50'}`} title={filename}>{filename}{itemType !== 'folder' ? '.bru' : ''}</p>
      <IconEdit className="cursor-pointer opacity-50 hover:opacity-80" size={20} strokeWidth={1.5} onClick={() => toggleEditingFilename(v => !v)} />
    </div>
    :
    <></>

  return (
    <StyledWrapper>
      <Modal
        size="md"
        title={`Rename ${isFolder ? 'Folder' : 'Request'}`}
        confirmText="Rename"
        handleConfirm={onSubmit}
        handleCancel={onClose}
        customFooter={filenameFooter}
      >
        <form className="bruno-form" onSubmit={e => {e.preventDefault()}}>
          <div className='flex flex-col mt-2'>
            <label htmlFor="name" className="block font-semibold">
              {isFolder ? 'Folder' : 'Request'} Name
            </label>
            <input
              id="collection-item-name"
              type="text"
              name="name"
              ref={inputRef}
              className="block textbox mt-2 w-full"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              onChange={e => {
                formik.setFieldValue('name', e.target.value);
                !isEditingFilename && formik.setFieldValue('filename', sanitizeName(e.target.value));
              }}
              value={formik.values.name || ''}
            />
            {formik.touched.name && formik.errors.name ? <div className="text-red-500">{formik.errors.name}</div> : null}
          </div>
          {formik.touched.filename && formik.errors.filename ? <div className="text-red-500">{formik.errors.filename}</div> : null}
          {
            isEditingFilename ?
              <div className="mt-4">
                <label htmlFor="filename" className="block font-semibold">
                  {isFolder ? 'Directory' : 'File'} Name
                </label>
                <div className='relative flex flex-row gap-1 items-center justify-between'>
                  <input
                    id="file-name"
                    type="text"
                    name="filename"
                    placeholder="File Name"
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
                {formik.touched.filename && formik.errors.filename ? (
                  <div className="text-red-500">{formik.errors.filename}</div>
                ) : null}
              </div>
              :
              <></>
          }
        </form>
      </Modal>
    </StyledWrapper>
  );
};

export default RenameCollectionItem;
