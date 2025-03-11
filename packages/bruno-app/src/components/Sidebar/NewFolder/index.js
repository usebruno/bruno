import React, { useRef, useEffect, useState } from 'react';
import { useFormik } from 'formik';
import toast from 'react-hot-toast';
import * as Yup from 'yup';
import Modal from 'components/Modal';
import { useDispatch } from 'react-redux';
import { newFolder } from 'providers/ReduxStore/slices/collections/actions';
import { IconEdit, IconFolder } from '@tabler/icons';
import { sanitizeName, validateName, validateNameError } from 'utils/common/regex';
import StyledWrapper from './StyledWrapper';
import PathDisplay from 'components/PathDisplay';

const NewFolder = ({ collection, item, onClose }) => {
  const dispatch = useDispatch();
  const inputRef = useRef();
  const [isEditingFilename, toggleEditingFilename] = useState(false);

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      folderName: '',
      directoryName: ''
    },
    validationSchema: Yup.object({
      folderName: Yup.string()
        .trim()
        .min(1, 'must be at least 1 character')
        .required('name is required'),
      directoryName: Yup.string()
        .trim()
        .min(1, 'must be at least 1 character')
        .required('foldername is required')
        .test('is-valid-folder-name', function(value) {
          const isValid = validateName(value);
          return isValid ? true : this.createError({ message: validateNameError(value) });
        })
        .test({
          name: 'folderName',
          message: 'The folder name "environments" at the root of the collection is reserved in bruno',
          test: (value) => {
            if (item?.uid) return true;
            return value && !value.trim().toLowerCase().includes('environments');
          }
        })
    }),
    onSubmit: (values) => {
      dispatch(newFolder(values.folderName, values.directoryName, collection.uid, item ? item.uid : null))
        .then(() => {
          toast.success('New folder created!');
          onClose();
        })
        .catch((err) => toast.error(err ? err.message : 'An error occurred while adding the folder'));
    }
  });

  useEffect(() => {
    if (inputRef && inputRef.current) {
      inputRef.current.focus();
    }
  }, [inputRef]);

  const onSubmit = () => formik.handleSubmit();

  return (
    <StyledWrapper>
      <Modal size="md" title="New Folder" confirmText="Create" handleConfirm={onSubmit} handleCancel={onClose}>
        <form className="bruno-form" onSubmit={formik.handleSubmit}>
          <div>
            <label htmlFor="folderName" className="block font-semibold">
              Folder Name
            </label>
            <input
              id="collection-name"
              type="text"
              name="folderName"
              ref={inputRef}
              className="block textbox mt-2 w-full"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              onChange={e => {
                formik.setFieldValue('folderName', e.target.value);
                !isEditingFilename && formik.setFieldValue('directoryName', sanitizeName(e.target.value));
              }}
              value={formik.values.folderName || ''}
            />
            {formik.touched.folderName && formik.errors.folderName ? (
              <div className="text-red-500">{formik.errors.folderName}</div>
            ) : null}
          </div>
          
          {isEditingFilename ? (
            <div className="mt-4">
              <div className="flex items-center justify-between">
                <label htmlFor="directoryName" className="block font-semibold">
                  Directory Name
                </label>
                <IconEdit 
                  className="cursor-pointer opacity-50 hover:opacity-80" 
                  size={16} 
                  strokeWidth={1.5} 
                  onClick={() => toggleEditingFilename(false)} 
                />
              </div>
              <div className='relative flex flex-row gap-1 items-center justify-between'>
                <input
                  id="file-name"
                  type="text"
                  name="directoryName"
                  placeholder="Directory Name"
                  className={`block textbox mt-2 w-full`}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                  onChange={formik.handleChange}
                  value={formik.values.directoryName || ''}
                />
              </div>
              {formik.touched.directoryName && formik.errors.directoryName ? (
                <div className="text-red-500">{formik.errors.directoryName}</div>
              ) : null}
            </div>
          ) : (
            <>
              <PathDisplay 
                collection={collection}
                item={item}
                filename={formik.values.directoryName}
                showExtension={false}
                isEditingFilename={isEditingFilename}
                toggleEditingFilename={toggleEditingFilename}
              />
              {formik.touched.directoryName && formik.errors.directoryName ? (
                <div className="text-red-500">{formik.errors.directoryName}</div>
              ) : null}
            </>
          )}
        </form>
      </Modal>
    </StyledWrapper>
  );
};

export default NewFolder;
