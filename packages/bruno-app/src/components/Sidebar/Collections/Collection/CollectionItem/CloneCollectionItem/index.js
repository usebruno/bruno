import React, { useState, useRef, useEffect, forwardRef } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import Modal from 'components/Modal';
import { useDispatch, useSelector } from 'react-redux';
import { isItemAFolder } from 'utils/tabs';
import { cloneItem } from 'providers/ReduxStore/slices/collections/actions';
import { IconArrowBackUp, IconEdit, IconCaretDown } from '@tabler/icons';
import { sanitizeName, validateName, validateNameError } from 'utils/common/regex';
import Help from 'components/Help';
import PathDisplay from 'components/PathDisplay/index';
import path from 'utils/common/path';
import Portal from 'components/Portal';
import Dropdown from 'components/Dropdown';
import StyledWrapper from './StyledWrapper';
import Button from 'ui/Button';

const CloneCollectionItem = ({ collectionUid, item, onClose }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const collection = useSelector((state) => state.collections.collections?.find((c) => c.uid === collectionUid));
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
        .min(1, t('SIDEBAR.MUST_BE_AT_LEAST_1_CHAR'))
        .max(255, t('SIDEBAR.MUST_BE_255_OR_LESS'))
        .required(t('SIDEBAR.NAME_REQUIRED')),
      filename: Yup.string()
        .min(1, t('SIDEBAR.MUST_BE_AT_LEAST_1_CHAR'))
        .max(255, t('SIDEBAR.MUST_BE_255_OR_LESS'))
        .required(t('SIDEBAR.NAME_REQUIRED'))
        .test('is-valid-name', function (value) {
          const isValid = validateName(value);
          return isValid ? true : this.createError({ message: validateNameError(value) });
        })
        .test('not-reserved', t('SIDEBAR.RESERVED_NAMES'), (value) => !['collection', 'folder'].includes(value))
    }),
    onSubmit: (values) => {
      dispatch(cloneItem(values.name, values.filename, item.uid, collectionUid))
        .then(() => {
          toast.success(t('SIDEBAR.REQUEST_CLONED'));
          onClose();
        })
        .catch((err) => {
          toast.error(err ? err.message : t('SIDEBAR.ERROR_CLONING_REQUEST'));
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
          {t('COMMON.OPTIONS')}
        </button>
        <IconCaretDown className="caret ml-1" size={14} strokeWidth={2} />
      </div>
    );
  });

  return (
    <Portal>
      <StyledWrapper>
        <Modal
          size="md"
          title={isFolder ? t('SIDEBAR.CLONE_FOLDER') : t('SIDEBAR.CLONE_REQUEST')}
          handleCancel={onClose}
          hideFooter
        >
          <form className="bruno-form" onSubmit={formik.handleSubmit}>
            <div>
              <label htmlFor="name" className="block font-medium">
                {isFolder ? t('SIDEBAR.FOLDER_NAME') : t('SIDEBAR.REQUEST_NAME')}
              </label>
              <input
                id="collection-item-name"
                type="text"
                name="name"
                placeholder={t('SIDEBAR.ENTER_EXAMPLE_NAME')}
                ref={inputRef}
                className="block textbox mt-2 w-full"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                onChange={(e) => {
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
                  <label htmlFor="filename" className="flex items-center font-medium">
                    {isFolder ? t('SIDEBAR.FOLDER_NAME') : t('SIDEBAR.FILE_NAME')} <small className="font-normal text-muted ml-1">{t('SIDEBAR.ON_FILESYSTEM')}</small>
                    { isFolder ? (
                      <Help width="300">
                        <p>
                          {t('SIDEBAR.FILESYSTEM_NAME_HELP')}
                        </p>
                      </Help>
                    ) : (
                      <Help width="300">
                        <p>
                          {t('SIDEBAR.INFO_REQUEST_FILE')}
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
                  <div className="relative flex flex-row gap-1 items-center justify-between">
                    <input
                      id="file-name"
                      type="text"
                      name="filename"
                      placeholder={isFolder ? t('SIDEBAR.FOLDER_NAME') : t('SIDEBAR.FILE_NAME')}
                      className="!pr-10 block textbox mt-2 w-full"
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck="false"
                      onChange={formik.handleChange}
                      value={formik.values.filename || ''}
                    />
                    {itemType !== 'folder' && <span className="absolute right-2 top-4 flex justify-center items-center file-extension">.{collection?.format || 'bru'}</span>}
                  </div>
                ) : (
                  <div className="relative flex flex-row gap-1 items-center justify-between">
                    <PathDisplay
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
              <div className="flex advanced-options">
                <Dropdown onCreate={onDropdownCreate} icon={<AdvancedOptions />} placement="bottom-start">
                  <div
                    className="dropdown-item"
                    key="show-filesystem-name"
                    onClick={(e) => {
                      dropdownTippyRef.current.hide();
                      toggleShowFilesystemName(!showFilesystemName);
                    }}
                  >
                    {showFilesystemName ? t('SIDEBAR.HIDE_FILESYSTEM_NAME') : t('SIDEBAR.SHOW_FILESYSTEM_NAME')}
                  </div>
                </Dropdown>
              </div>
              <div className="flex justify-end">
                <Button type="button" color="secondary" variant="ghost" onClick={onClose} className="mr-2">
                  {t('COMMON.CANCEL')}
                </Button>
                <Button type="submit" data-testid="clone-item-button">
                  {t('COMMON.CLONE')}
                </Button>
              </div>
            </div>
          </form>
        </Modal>
      </StyledWrapper>
    </Portal>
  );
};

export default CloneCollectionItem;
