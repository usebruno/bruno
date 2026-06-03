import React, { useRef, useEffect, useState, forwardRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import path from 'utils/common/path';
import { browseDirectory, createCollection } from 'providers/ReduxStore/slices/collections/actions';
import toast from 'react-hot-toast';
import Portal from 'components/Portal';
import Modal from 'components/Modal';
import { sanitizeName, validateName, validateNameError } from 'utils/common/regex';
import PathDisplay from 'components/PathDisplay/index';
import { IconArrowBackUp, IconEdit, IconCaretDown } from '@tabler/icons';
import Help from 'components/Help';
import Dropdown from 'components/Dropdown';
import { multiLineMsg } from 'utils/common';
import { formatIpcError } from 'utils/common/error';
import { DEFAULT_COLLECTION_FORMAT } from 'utils/common/constants';
import StyledWrapper from './StyledWrapper';
import get from 'lodash/get';
import Button from 'ui/Button';

const CreateCollection = ({ onClose, defaultLocation: propDefaultLocation, initialCollectionName = '' }) => {
  const { t } = useTranslation();
  const inputRef = useRef();
  const dispatch = useDispatch();
  const workspaces = useSelector((state) => state.workspaces?.workspaces || []);
  const workspaceUid = useSelector((state) => state.workspaces?.activeWorkspaceUid);
  const [isEditing, toggleEditing] = useState(false);
  const [showFileFormat, setShowFileFormat] = useState(false);
  const preferences = useSelector((state) => state.app.preferences);

  const dropdownTippyRef = useRef();
  const onDropdownCreate = (ref) => (dropdownTippyRef.current = ref);
  const activeWorkspace = workspaces.find((w) => w.uid === workspaceUid);
  const isDefaultWorkspace = activeWorkspace?.type === 'default';

  const defaultLocation = isDefaultWorkspace ? get(preferences, 'general.defaultLocation', '') : (activeWorkspace?.pathname ? path.join(activeWorkspace.pathname, 'collections') : '');

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      collectionName: initialCollectionName,
      collectionFolderName: initialCollectionName ? sanitizeName(initialCollectionName) : '',
      collectionLocation: defaultLocation || '',
      format: DEFAULT_COLLECTION_FORMAT
    },
    validationSchema: Yup.object({
      collectionName: Yup.string()
        .trim()
        .min(1, t('SIDEBAR.COLLECTION_NAME_CANT_BE_EMPTY'))
        .max(255, t('SIDEBAR.MUST_BE_255_OR_LESS'))
        .required(t('SIDEBAR.COLLECTION_NAME_REQUIRED')),
      collectionFolderName: Yup.string()
        .min(1, t('SIDEBAR.MUST_BE_AT_LEAST_1_CHAR'))
        .max(255, t('SIDEBAR.MUST_BE_255_OR_LESS'))
        .test('is-valid-collection-name', function (value) {
          const isValid = validateName(value);
          return isValid ? true : this.createError({ message: validateNameError(value) });
        })
        .required(t('SIDEBAR.FOLDER_NAME_REQUIRED')),
      collectionLocation: Yup.string().min(1, t('SIDEBAR.LOCATION_REQUIRED')).required(t('SIDEBAR.LOCATION_REQUIRED')),
      format: Yup.string().oneOf(['bru', 'yml'], t('SIDEBAR.INVALID_FORMAT')).required(t('SIDEBAR.FORMAT_REQUIRED'))
    }),
    onSubmit: async (values) => {
      try {
        await dispatch(createCollection(values.collectionName.trim(),
          values.collectionFolderName,
          values.collectionLocation,
          { format: values.format }));

        toast.success(t('SIDEBAR.COLLECTION_CREATED'));
        onClose();
      } catch (e) {
        toast.error(multiLineMsg(t('SIDEBAR.ERROR_CREATING_COLLECTION'), formatIpcError(e)));
      }
    }
  });

  const browse = () => {
    dispatch(browseDirectory())
      .then((dirPath) => {
        if (typeof dirPath === 'string') {
          formik.setFieldValue('collectionLocation', dirPath);
        }
      })
      .catch(() => {
        formik.setFieldValue('collectionLocation', '');
      });
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (inputRef && inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
    }, 50);
    return () => clearTimeout(timer);
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
        <Modal size="md" title={t('SIDEBAR.CREATE_COLLECTION_TITLE')} hideFooter={true} handleCancel={onClose}>
          <form className="bruno-form" onSubmit={formik.handleSubmit}>
            <div>
              <label htmlFor="collection-name" className="flex items-center font-medium">
                {t('COMMON.NAME')}
              </label>
              <input
                id="collection-name"
                type="text"
                name="collectionName"
                ref={inputRef}
                className="block textbox mt-2 w-full"
                onChange={(e) => {
                  const collectionName = e.target.value;
                  if (!isEditing) {
                    formik.setValues((values) => ({
                      ...values,
                      collectionName,
                      collectionFolderName: sanitizeName(collectionName)
                    }));
                    return;
                  }

                  formik.handleChange(e);
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

              <label htmlFor="collection-location" className="font-medium mt-3 flex items-center">
                {t('COMMON.LOCATION')}
                <Help>
                  <p>
                    {t('SIDEBAR.BRUNO_STORES_ON_DISK')}
                  </p>
                  <p className="mt-2">
                    {t('SIDEBAR.CHOOSE_LOCATION')}
                  </p>
                </Help>
              </label>
              <input
                id="collection-location"
                type="text"
                name="collectionLocation"
                className="block textbox mt-2 w-full cursor-pointer"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                readOnly={true}
                value={formik.values.collectionLocation || ''}
                onClick={browse}
                onChange={(e) => {
                  formik.setFieldValue('collectionLocation', e.target.value);
                }}
              />
              {formik.touched.collectionLocation && formik.errors.collectionLocation ? (
                <div className="text-red-500">{formik.errors.collectionLocation}</div>
              ) : null}
              <div className="mt-1">
                <span
                  className="text-link cursor-pointer hover:underline"
                  onClick={browse}
                >
                  Browse
                </span>
              </div>
              {formik.values.collectionName?.trim()?.length > 0 && (
                <div className="mt-4">
                  <div className="flex items-center justify-between">
                    <label htmlFor="filename" className="flex items-center font-medium">
                      {t('SIDEBAR.FOLDER_NAME')}
                      <Help width="300">
                        <p>
                          {t('SIDEBAR.FOLDER_NAME_HELP')}
                        </p>
                        <p className="mt-2">
                          {t('SIDEBAR.FOLDER_NAME_HELP2')}
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
                    <div className="relative flex flex-row gap-1 items-center justify-between">
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

              {showFileFormat && (
                <div className="mt-4">
                  <label htmlFor="format" className="flex items-center font-medium">
                    {t('SIDEBAR.FILE_FORMAT')}
                    <Help width="300">
                      <p>
                        {t('SIDEBAR.CHOOSE_FILE_FORMAT')}
                      </p>
                      <p className="mt-2">
                        <strong>OpenCollection (YAML):</strong> {t('SIDEBAR.OPENCOLLECTION_YAML')}
                      </p>
                      <p className="mt-1">
                        <strong>BRU:</strong> {t('SIDEBAR.BRU_FORMAT')}
                      </p>
                    </Help>
                  </label>
                  <select
                    id="format"
                    name="format"
                    className="block textbox mt-2 w-full"
                    value={formik.values.format}
                    onChange={formik.handleChange}
                  >
                    <option value="yml">{t('SIDEBAR.OPENCOLLECTION_FORMAT')}</option>
                    <option value="bru">{t('SIDEBAR.BRU_FORMAT_OPTION')}</option>
                  </select>
                  {formik.touched.format && formik.errors.format ? (
                    <div className="text-red-500">{formik.errors.format}</div>
                  ) : null}
                </div>
              )}
            </div>
            <div className="flex justify-between items-center mt-8 bruno-modal-footer">
              <div className="flex advanced-options">
                <Dropdown onCreate={onDropdownCreate} icon={<AdvancedOptions />} placement="bottom-start">
                  <div
                    className="dropdown-item"
                    key="show-file-format"
                    onClick={(e) => {
                      dropdownTippyRef.current.hide();
                      setShowFileFormat(!showFileFormat);
                    }}
                  >
                    {showFileFormat ? t('SIDEBAR.HIDE_FILE_FORMAT') : t('SIDEBAR.SHOW_FILE_FORMAT')}
                  </div>
                </Dropdown>
              </div>
              <div className="flex justify-end">
                <Button type="button" color="secondary" variant="ghost" onClick={onClose} className="mr-2">
                  {t('COMMON.CANCEL')}
                </Button>
                <Button type="submit">
                  {t('COMMON.CREATE')}
                </Button>
              </div>
            </div>
          </form>
        </Modal>
      </StyledWrapper>
    </Portal>
  );
};

export default CreateCollection;
