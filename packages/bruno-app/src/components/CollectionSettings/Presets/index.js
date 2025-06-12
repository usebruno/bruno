import React, { useState, useRef } from 'react';
import { useFormik } from 'formik';
import { useDispatch } from 'react-redux';
import StyledWrapper from './StyledWrapper';
import toast from 'react-hot-toast';
import { updateBrunoConfig } from 'providers/ReduxStore/slices/collections/actions';
import cloneDeep from 'lodash/cloneDeep';
import { IconTrash, IconFile, IconFileImport, IconAlertCircle } from '@tabler/icons';

const getBasename = (filePath) => {
  const parts = filePath.split(/[/\\]/);
  return parts[parts.length - 1];
};

const getDirPath = (filePath) => {
  const parts = filePath.split(/[/\\]/);
  parts.pop();
  return parts.join('/');
};

const getRelativePath = (absolutePath, collectionPath) => {
  try {
    const relativePath = window?.ipcRenderer?.getRelativePath(absolutePath, collectionPath);
    return relativePath || absolutePath;
  } catch (error) {
    return absolutePath;
  }
};

const PresetsSettings = ({ collection }) => {
  const dispatch = useDispatch();
  const {
    brunoConfig: { presets: presets = {} }
  } = collection;

  // State to manage proto files input field
  const [protoFile, setProtoFile] = useState('');
  const fileInputRef = useRef(null);

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      requestType: presets.requestType || 'http',
      requestUrl: presets.requestUrl || '',
      protoFiles: presets.protoFiles || []
    },
    onSubmit: (newPresets) => {
      const brunoConfig = cloneDeep(collection.brunoConfig);
      brunoConfig.presets = newPresets;
      dispatch(updateBrunoConfig(brunoConfig, collection.uid));
      toast.success('Collection presets updated');
    }
  });

  // Handler for adding a new proto file manually
  const handleAddProtoFile = () => {
    if (protoFile.trim()) {
      formik.setFieldValue('protoFiles', [...formik.values.protoFiles, protoFile.trim()]);
      setProtoFile('');
    }
  };

  // Get file path using the ipcRenderer
  const getProtoFile = (event) => {
    const files = event?.files;
    if (files && files.length > 0) {
      const newProtoFiles = [...formik.values.protoFiles];
      
      for (let i = 0; i < files.length; i++) {
        const filePath = window?.ipcRenderer?.getFilePath(files[i]);
        if (filePath) {
          const relativePath = getRelativePath(filePath, collection.pathname);
          const protoFileObj = {
            path: relativePath,
            type: 'relative'
          };
          
          // Check if this path already exists
          const exists = newProtoFiles.some(pf => pf.path === protoFileObj.path);
          if (!exists) {
            newProtoFiles.push(protoFileObj);
          }
        }
      }
      
      formik.setFieldValue('protoFiles', newProtoFiles);
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Handler for removing a proto file
  const handleRemoveProtoFile = (index) => {
    const updatedProtoFiles = [...formik.values.protoFiles];
    updatedProtoFiles.splice(index, 1);
    formik.setFieldValue('protoFiles', updatedProtoFiles);
  };

  // Handle the browse button click
  const handleBrowseClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };



  // Check if a proto file path is valid
  const isProtoFileValid = (protoFile) => {
    try {
      const absolutePath = window?.ipcRenderer?.resolvePath(protoFile.path, collection.pathname);
      return window?.ipcRenderer?.existsSync(absolutePath);
    } catch (error) {
      return false;
    }
  };

  // Handle replacing an invalid proto file
  const handleReplaceProtoFile = (index) => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
      // Store the index to replace after file selection
      fileInputRef.current.dataset.replaceIndex = index;
    }
  };

  return (
    <StyledWrapper className="h-full w-full">
      <div className="text-xs mb-4 text-muted">
        These presets will be used as the default values for new requests in this collection.
      </div>
      <form className="bruno-form" onSubmit={formik.handleSubmit}>
        <div className="mb-3 flex items-center">
          <label className="settings-label flex  items-center" htmlFor="enabled">
            Request Type
          </label>
          <div className="flex items-center">
            <input
              id="http"
              className="cursor-pointer"
              type="radio"
              name="requestType"
              onChange={formik.handleChange}
              value="http"
              checked={formik.values.requestType === 'http'}
            />
            <label htmlFor="http" className="ml-1 cursor-pointer select-none">
              HTTP
            </label>

            <input
              id="graphql"
              className="ml-4 cursor-pointer"
              type="radio"
              name="requestType"
              onChange={formik.handleChange}
              value="graphql"
              checked={formik.values.requestType === 'graphql'}
            />
            <label htmlFor="graphql" className="ml-1 cursor-pointer select-none">
              GraphQL
            </label>

            <input
              id="grpc"
              className="ml-4 cursor-pointer"
              type="radio"
              name="requestType"
              onChange={formik.handleChange}
              value="grpc"
              checked={formik.values.requestType === 'grpc'}
            />
            <label htmlFor="grpc" className="ml-1 cursor-pointer select-none">
              gRPC
            </label>
          </div>
        </div>
        <div className="mb-3 flex items-center">
          <label className="settings-label" htmlFor="requestUrl">
            Base URL
          </label>
          <div className="flex items-center w-full">
            <div className="flex items-center flex-grow input-container h-full">
              <input
                id="request-url"
                type="text"
                name="requestUrl"
                placeholder='Request URL'
                className="block textbox"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                onChange={formik.handleChange}
                value={formik.values.requestUrl || ''}
                style={{ width: '100%' }}
              />
            </div>
          </div>
        </div>

        {/* Proto Files Section - Only visible when gRPC is selected */}
        {formik.values.requestType === 'grpc' && (
          <div className="mb-3 border border-neutral-600 rounded p-4">
            <label className="font-semibold text-sm mb-3 block" htmlFor="protoFiles">
              Proto Files
            </label>
            <div className="text-xs text-muted mb-4">
              <IconAlertCircle size={14} className="inline mr-1" />
              Keep your proto files within the collection folder or the corresponding git repository to ensure paths remain valid when sharing the collection.
            </div>
            <div className="flex flex-col">
              {/* Hidden file input for file selection */}
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept=".proto"
                multiple
                onChange={(e) => {
                  const replaceIndex = e.target.dataset.replaceIndex;
                  if (replaceIndex !== undefined) {
                    // Handle replacement
                    const files = e.target.files;
                    if (files && files.length > 0) {
                      const filePath = window?.ipcRenderer?.getFilePath(files[0]);
                      if (filePath) {
                        const relativePath = getRelativePath(filePath, collection.pathname);
                        const updatedProtoFiles = [...formik.values.protoFiles];
                        updatedProtoFiles[replaceIndex] = {
                          path: relativePath,
                          type: 'relative'
                        };
                        formik.setFieldValue('protoFiles', updatedProtoFiles);
                      }
                    }
                    delete e.target.dataset.replaceIndex;
                  } else {
                    getProtoFile(e.target);
                  }
                }}
              />
              
              <div className="flex flex-col gap-3">
                {/* File selection options */}
                <div className="flex flex-col space-y-3">
                  <div className="flex items-center">
                    <button
                      type="button"
                      className="btn btn-sm btn-secondary flex items-center"
                      onClick={handleBrowseClick}
                    >
                      <IconFileImport size={16} strokeWidth={1.5} className="mr-1" />
                      Browse for proto files
                    </button>
                  </div>
                </div>
                
                {/* Divider */}
                <div className="border-t border-neutral-600 my-2"></div>
                
                {/* List of added proto files */}
                <div>
                  <div className="text-sm font-semibold mb-2 flex items-center">
                    <IconFile size={16} strokeWidth={1.5} className="mr-1" />
                    Added Proto Files ({formik.values.protoFiles.length})
                  </div>
                  
                  {formik.values.protoFiles.length === 0 ? (
                    <div className="text-neutral-500 text-sm italic">No proto files added yet</div>
                  ) : (
                    <>
                      {formik.values.protoFiles.some(file => !isProtoFileValid(file)) && (
                        <div className="text-xs text-red-500 mb-2 flex items-center bg-red-50 dark:bg-red-900/20 p-2 rounded">
                          <IconAlertCircle size={14} className="mr-1" />
                          Some proto files cannot be found at their specified paths. Use the "Replace" option to update their locations.
                        </div>
                      )}
                      <div className="space-y-2 max-h-48 overflow-y-auto border border-neutral-700 rounded p-2">
                        {formik.values.protoFiles.map((file, index) => {
                          const isValid = isProtoFileValid(file);
                          return (
                            <div key={index} className="flex justify-between items-center py-1 px-2 hover:bg-[#f4f4f4] dark:hover:bg-neutral-700 rounded group">
                              <div className="flex items-center flex-grow">
                                <div
                                  className="overflow-hidden text-ellipsis whitespace-nowrap max-w-[300px] text-sm"
                                  title={file.path}
                                >
                                  {getBasename(file.path)}
                                  <span className="text-xs text-neutral-500 ml-2">
                                    {getDirPath(file.path)}
                                  </span>
                                </div>
                                {!isValid && (
                                  <div className="flex items-center ml-2">
                                    <IconAlertCircle
                                      size={16}
                                      className="text-red-500"
                                      title="Proto file not found. Click to replace."
                                    />
                                    <button
                                      type="button"
                                      className="text-xs text-red-500 ml-1 hover:underline"
                                      onClick={() => handleReplaceProtoFile(index)}
                                    >
                                      Replace
                                    </button>
                                  </div>
                                )}
                              </div>
                              <button
                                type="button"
                                className="text-neutral-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => handleRemoveProtoFile(index)}
                                title="Remove file"
                              >
                                <IconTrash size={16} strokeWidth={1.5} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6">
          <button type="submit" className="submit btn btn-sm btn-secondary">
            Save
          </button>
        </div>
      </form>
    </StyledWrapper>
  );
};

export default PresetsSettings;
