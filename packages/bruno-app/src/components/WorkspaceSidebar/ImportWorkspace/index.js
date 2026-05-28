import React, { useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import toast from 'react-hot-toast';
import get from 'lodash/get';
import { IconFileZip } from '@tabler/icons';
import Modal from 'components/Modal';
import { browseDirectory } from 'providers/ReduxStore/slices/collections/actions';
import { importWorkspaceAction } from 'providers/ReduxStore/slices/workspaces/actions';
import { formatIpcError } from 'utils/common/error';
import { multiLineMsg } from 'utils/common/index';
import Help from 'components/Help';

const ImportWorkspace = ({ onClose }) => {
  const dispatch = useDispatch();
  const preferences = useSelector((state) => state.app.preferences);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef(null);
  const locationInputRef = useRef(null);

  const defaultLocation = get(preferences, 'general.defaultLocation', '');

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      workspaceLocation: defaultLocation
    },
    validationSchema: Yup.object({
      workspaceLocation: Yup.string().min(1, 'location is required').required('location is required')
    }),
    onSubmit: async (values) => {
      if (isSubmitting || !selectedFile) return;

      try {
        setIsSubmitting(true);
        await dispatch(importWorkspaceAction(selectedFile.path, values.workspaceLocation));
        toast.success('Workspace imported successfully!');
        onClose();
      } catch (error) {
        toast.error(multiLineMsg('Failed to import workspace', formatIpcError(error)));
      } finally {
        setIsSubmitting(false);
      }
    }
  });

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }

    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const validateAndGetFilePath = (file) => {
    if (!file) return null;

    const isZip = file.name.endsWith('.zip') || file.type === 'application/zip' || file.type === 'application/x-zip-compressed';
    if (!isZip) {
      toast.error('Please select a valid zip file');
      return null;
    }

    const filePath = window?.ipcRenderer?.getFilePath(file);
    if (!filePath) {
      toast.error('Could not get file path');
      return null;
    }

    return { name: file.name, path: filePath };
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const fileInfo = validateAndGetFilePath(e.dataTransfer.files[0]);
      if (fileInfo) {
        setSelectedFile(fileInfo);
      }
    }
  };

  const handleBrowseFiles = () => {
    fileInputRef.current.click();
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const fileInfo = validateAndGetFilePath(e.target.files[0]);
      if (fileInfo) {
        setSelectedFile(fileInfo);
      }
    }
  };

  const browse = () => {
    dispatch(browseDirectory())
      .then((dirPath) => {
        if (typeof dirPath === 'string' && dirPath.length > 0) {
          formik.setFieldValue('workspaceLocation', dirPath);
        }
      })
      .catch((error) => {
        formik.setFieldValue('workspaceLocation', '');
        console.error(error);
      });
  };

  const handleClearFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  useEffect(() => {
    if (locationInputRef && locationInputRef.current) {
      locationInputRef.current.focus();
    }
  }, [locationInputRef]);

  const canSubmit = selectedFile && formik.values.workspaceLocation && !isSubmitting;

  return (
    <Modal
      size="md"
      title="Import Workspace"
      confirmText={isSubmitting ? 'Importing...' : 'Import'}
      handleConfirm={formik.handleSubmit}
      handleCancel={onClose}
      confirmDisabled={!canSubmit}
    >
      <div className="flex flex-col">
        <div className="mb-4">
          <h3 className="font-semibold mb-2">Workspace File</h3>
          {selectedFile ? (
            <div className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800">
              <div className="flex items-center gap-2">
                <IconFileZip size={20} className="text-gray-500" />
                <span className="text-gray-700 dark:text-gray-300">{selectedFile.name}</span>
              </div>
              <button
                type="button"
                className="text-gray-500 hover:text-red-500 text-sm"
                onClick={handleClearFile}
              >
                Remove
              </button>
            </div>
          ) : (
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`
                border-2 border-dashed rounded-lg p-6 transition-colors duration-200
                ${dragActive ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700'}
              `}
            >
              <div className="flex flex-col items-center justify-center">
                <IconFileZip
                  size={28}
                  className="text-gray-400 dark:text-gray-500 mb-3"
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileInputChange}
                  accept=".zip,application/zip,application/x-zip-compressed"
                />
                <p className="text-gray-600 dark:text-gray-300 mb-2">
                  Drop workspace zip file here or{' '}
                  <button
                    type="button"
                    className="text-blue-500 underline cursor-pointer"
                    onClick={handleBrowseFiles}
                  >
                    choose a file
                  </button>
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Supports exported Bruno workspace zip files
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="mb-4">
          <label htmlFor="workspace-location" className="font-semibold mb-2 flex items-center">
            Extract Location
            <Help>
              <p>
                Choose the location where you want to extract this workspace.
              </p>
              <p className="mt-2">
                The workspace folder will be created at this location.
              </p>
            </Help>
          </label>
          <input
            id="workspace-location"
            type="text"
            name="workspaceLocation"
            ref={locationInputRef}
            readOnly={true}
            className="block textbox mt-2 w-full cursor-pointer"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            value={formik.values.workspaceLocation || ''}
            onClick={browse}
          />
          {formik.touched.workspaceLocation && formik.errors.workspaceLocation ? (
            <div className="text-red-500 text-sm mt-1">{formik.errors.workspaceLocation}</div>
          ) : null}
          <div className="mt-1">
            <span
              className="text-link cursor-pointer hover:underline"
              onClick={browse}
            >
              Browse
            </span>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default ImportWorkspace;
