import React, { useRef, useEffect, forwardRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import path from 'path';
import { browseDirectory, createCollection } from 'providers/ReduxStore/slices/collections/actions';
import toast from 'react-hot-toast';
import Portal from 'components/Portal';
import Modal from 'components/Modal';
import { sanitizeName, validateName, validateNameError } from 'utils/common/regex';
import PathDisplay from 'components/PathDisplay/index';
import { useState } from 'react';
import { IconArrowBackUp, IconEdit, IconCaretDown } from '@tabler/icons';
import Help from 'components/Help';
import { multiLineMsg } from "utils/common";
import { formatIpcError } from "utils/common/error";
import { toggleSidebarCollapse } from 'providers/ReduxStore/slices/app';
import Dropdown from 'components/Dropdown';
import StyledWrapper from './StyledWrapper';
import get from 'lodash/get';

const CreateCollection = ({ onClose, defaultLocation: propDefaultLocation }) => {
  const inputRef = useRef();
  const dispatch = useDispatch();
  const workspaces = useSelector((state) => state.workspaces?.workspaces || []);
  const workspaceUid = useSelector((state) => state.workspaces?.activeWorkspaceUid);
  const [isEditing, toggleEditing] = useState(false);
  const preferences = useSelector((state) => state.app.preferences);
  const [showExternalLocation, setShowExternalLocation] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const dropdownTippyRef = useRef();
  const onDropdownCreate = (ref) => (dropdownTippyRef.current = ref);

  const activeWorkspace = workspaces.find((w) => w.uid === workspaceUid);
  const isDefaultWorkspace = activeWorkspace?.type === 'default';

  const hideLocationInput = activeWorkspace && activeWorkspace.type !== 'default' && !!activeWorkspace?.pathname;

  const defaultLocation = propDefaultLocation
    || (activeWorkspace?.pathname ? `${activeWorkspace.pathname}/collections` : '')
    || get(preferences, 'general.defaultCollectionLocation', '');

  const shouldShowAccordion = workspaceUid && hideLocationInput && !isDefaultWorkspace;
  const actuallyHideLocationInput = hideLocationInput && !showExternalLocation && !isDefaultWorkspace;

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      collectionName: '',
      collectionFolderName: '',
      collectionLocation: defaultLocation || '',
      format: 'yml'
    },
    validationSchema: Yup.object({
      collectionName: Yup.string()
        .min(1, 'must be at least 1 character')
        .max(255, 'must be 255 characters or less')
        .required('collection name is required'),
      collectionFolderName: Yup.string()
        .min(1, 'must be at least 1 character')
        .max(255, 'must be 255 characters or less')
        .test('is-valid-collection-name', function (value) {
          const isValid = validateName(value);
          return isValid ? true : this.createError({ message: validateNameError(value) });
        })
        .required('folder name is required'),
      collectionLocation: actuallyHideLocationInput
        ? Yup.string() // Optional for workspaces when not using external location
        : Yup.string().min(1, 'location is required').required('location is required'),
      format: Yup.string().oneOf(['bru', 'yml'], 'invalid format').required('format is required')
    }),
    onSubmit: async (values) => {
      try {
        const currentWorkspace = workspaces.find((w) => w.uid === workspaceUid);
        const useExternalLocation = workspaceUid && showExternalLocation && values.collectionLocation;

        let collectionLocation = values.collectionLocation;
        if (workspaceUid && !useExternalLocation && currentWorkspace && currentWorkspace.type !== 'default') {
          collectionLocation = path.join(currentWorkspace.pathname, 'collections');
        }

        await dispatch(createCollection(values.collectionName,
          values.collectionFolderName,
          collectionLocation,
          { format: values.format }));

        if (useExternalLocation && currentWorkspace) {
          const { ipcRenderer } = window;
          const collectionPath = path.join(values.collectionLocation, values.collectionFolderName);
          const workspaceCollection = {
            name: values.collectionName,
            path: collectionPath
          };
          await ipcRenderer.invoke('renderer:add-collection-to-workspace', currentWorkspace.pathname, workspaceCollection);
        }

        toast.success('Collection created!');
        onClose();
      } catch (e) {
        toast.error(multiLineMsg('An error occurred while creating the collection', formatIpcError(e)));
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
          Options
        </button>
        <IconCaretDown className="caret ml-1" size={14} strokeWidth={2} />
      </div>
    );
  });

  return (
    <Portal>
      <StyledWrapper>
        <Modal size="sm" title="Create Collection" hideFooter={true} handleCancel={onClose}>
          <form className="bruno-form" onSubmit={formik.handleSubmit}>
            <div>
              <label htmlFor="collection-name" className="flex items-center font-medium">
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

              {!actuallyHideLocationInput && (
                <>
                  <label htmlFor="collection-location" className="font-medium mt-3 flex items-center">
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
                    className="block textbox mt-2 w-full cursor-pointer"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck="false"
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
                </>
              )}
              {formik.values.collectionName?.trim()?.length > 0 && (
                <div className="mt-4">
                  <div className="flex items-center justify-between">
                    <label htmlFor="filename" className="flex items-center font-medium">
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

              {showAdvanced && (
                <div className="mt-4">
                  <label htmlFor="format" className="flex items-center font-medium">
                    File Format
                    <Help width="300">
                      <p>
                        Choose the file format for storing requests in this collection.
                      </p>
                      <p className="mt-2">
                        <strong>OpenCollection (YAML):</strong> Industry-standard YAML format (.yml files)
                      </p>
                      <p className="mt-1">
                        <strong>BRU:</strong> Bruno's native file format (.bru files)
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
                    <option value="yml">OpenCollection (YAML)</option>
                    <option value="bru">BRU Format (.bru)</option>
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
                  {shouldShowAccordion && (
                    <div
                      className="dropdown-item"
                      key="create-external-location"
                      onClick={(e) => {
                        dropdownTippyRef.current.hide();
                        setShowExternalLocation(!showExternalLocation);
                      }}
                    >
                      {showExternalLocation ? 'Use Default Location' : 'Create in External Location'}
                    </div>
                  )}
                  <div
                    className="dropdown-item"
                    key="show-file-format"
                    onClick={(e) => {
                      dropdownTippyRef.current.hide();
                      setShowAdvanced(!showAdvanced);
                    }}
                  >
                    {showAdvanced ? 'Hide File Format' : 'Show File Format'}
                  </div>
                </Dropdown>
              </div>
              <div className="flex justify-end">
                <span className="mr-2">
                  <button type="button" onClick={onClose} className="btn btn-md btn-close">
                    Cancel
                  </button>
                </span>
                <span>
                  <button
                    type="submit"
                    className="submit btn btn-md btn-secondary"
                  >
                    Create
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

export default CreateCollection;
