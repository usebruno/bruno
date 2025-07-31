import React, { useState, useRef, useEffect } from 'react';
import { useFormik } from 'formik';
import { useDispatch } from 'react-redux';
import StyledWrapper from './StyledWrapper';
import toast from 'react-hot-toast';
import { updateBrunoConfig } from 'providers/ReduxStore/slices/collections/actions';
import cloneDeep from 'lodash/cloneDeep';
import { IconTrash, IconFile, IconFileImport, IconAlertCircle } from '@tabler/icons';
import { getRelativePath, getBasename, getDirPath } from 'utils/common/path';
import { Tooltip } from 'react-tooltip';
import { existsSync, resolvePath } from '../../../utils/filesystem';

const GrpcSettings = ({ collection }) => {
  const dispatch = useDispatch();
  const {
    brunoConfig: { grpc: grpcConfig = {} }
  } = collection;

  const fileInputRef = useRef(null);
  const [protoFileValidity, setProtoFileValidity] = useState({});

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      protoFiles: grpcConfig.protoFiles || []
    },
    onSubmit: (newGrpcConfig) => {
      const brunoConfig = cloneDeep(collection.brunoConfig);
      brunoConfig.grpc = newGrpcConfig;
      dispatch(updateBrunoConfig(brunoConfig, collection.uid));
      toast.success('gRPC settings updated');
    }
  });

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
            type: 'file'
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
  const isProtoFileValid = async (protoFile) => {
    try {
      const absolutePath = await resolvePath(protoFile.path, collection.pathname);
      return await existsSync(absolutePath);
    } catch (error) {
      return false;
    }
  };

  // Validate all proto files and update state
  useEffect(() => {
    const validateProtoFiles = async () => {
      const validityMap = {};
      for (const file of formik.values.protoFiles) {
        validityMap[file.path] = await isProtoFileValid(file);
      }
      setProtoFileValidity(validityMap);
    };

    validateProtoFiles();
  }, [formik.values.protoFiles, collection.pathname]);

  // Handle replacing an invalid proto file
  const handleReplaceProtoFile = (index) => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
      // Store the index to replace after file selection
      fileInputRef.current.dataset.replaceIndex = index;
    }
  };

  // Handle file input change
  const handleFileInputChange = (e) => {
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
            type: 'file'
          };
          formik.setFieldValue('protoFiles', updatedProtoFiles);
        }
      }
      delete e.target.dataset.replaceIndex;
    } else {
      getProtoFile(e.target);
    }
  };

  return (
    <StyledWrapper className="h-full w-full">
      <form className="bruno-form" onSubmit={formik.handleSubmit}>
        <div className="mb-3">
          <label className="font-semibold text-sm mb-3 flex items-center" htmlFor="protoFiles">
            Add Proto Files
            <span id="proto-files-tooltip" className="ml-2">
              <IconAlertCircle size={16} className="text-gray-500 cursor-pointer" />
            </span>
            <Tooltip
              anchorId="proto-files-tooltip"
              className="tooltip-mod font-normal"
              html="Keep your proto files within the collection folder or the corresponding git repository to ensure paths remain valid when sharing the collection."
            />
          </label>
          <div className="flex flex-col">
            {/* Hidden file input for file selection */}
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept=".proto"
              multiple
              onChange={handleFileInputChange}
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
                    {formik.values.protoFiles.some(file => !protoFileValidity[file.path]) && (
                      <div className="text-xs text-red-500 mb-2 flex items-center bg-red-50 dark:bg-red-900/20 p-2 rounded">
                        <IconAlertCircle size={14} className="mr-1" />
                        Some proto files cannot be found at their specified paths. Use the "Replace" option to update their locations.
                      </div>
                    )}
                    <ul className="mt-4">
                      {formik.values.protoFiles.map((file, index) => {
                        const isValid = protoFileValidity[file.path];
                        return (
                          <li key={index} className="flex items-center available-certificates p-2 rounded-lg mb-2">
                            <div className="flex items-center w-full justify-between">
                              <div className="flex w-full items-center">
                                <IconFile className="mr-2" size={18} strokeWidth={1.5} />
                                <div
                                  className="overflow-hidden text-ellipsis whitespace-nowrap max-w-[300px] text-sm"
                                  title={file.path}
                                >
                                  {getBasename(file.path)}
                                  <span className="text-xs text-neutral-500 ml-2">
                                    {getDirPath(file.path)}
                                  </span>
                                </div>
                              </div>
                              <div className="flex w-full items-center justify-end">
                                {!isValid && (
                                  <div className="flex items-center mr-2">
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
                                <button
                                  type="button"
                                  className="remove-certificate ml-2"
                                  onClick={() => handleRemoveProtoFile(index)}
                                  title="Remove file"
                                >
                                  <IconTrash size={18} strokeWidth={1.5} />
                                </button>
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <button type="submit" className="submit btn btn-sm btn-secondary">
            Save
          </button>
        </div>
      </form>
    </StyledWrapper>
  );
};

export default GrpcSettings; 