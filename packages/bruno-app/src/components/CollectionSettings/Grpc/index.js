import React, { useState, useRef, useEffect } from 'react';
import { useFormik } from 'formik';
import { useDispatch } from 'react-redux';
import StyledWrapper from './StyledWrapper';
import toast from 'react-hot-toast';
import { updateBrunoConfig } from 'providers/ReduxStore/slices/collections/actions';
import cloneDeep from 'lodash/cloneDeep';
import { 
  IconTrash, 
  IconFile, 
  IconFileImport, 
  IconAlertCircle, 
  IconEdit, 
  IconCheck, 
  IconX,
  IconFolder,
  IconPlus
} from '@tabler/icons';
import { getRelativePath, getBasename, getDirPath } from 'utils/common/path';
import { Tooltip } from 'react-tooltip';
import { existsSync, resolvePath, browseDirectory, isDirectory } from '../../../utils/filesystem';

const GrpcSettings = ({ collection }) => {
  const dispatch = useDispatch();
  const {
    brunoConfig: { grpc: grpcConfig = {} }
  } = collection;

  const fileInputRef = useRef(null);
  const importPathInputRef = useRef(null);
  const [protoFileValidity, setProtoFileValidity] = useState({});
  const [importPathValidity, setImportPathValidity] = useState({});
  const [editingProtoFile, setEditingProtoFile] = useState(null);
  const [editingImportPath, setEditingImportPath] = useState(null);

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      protoFiles: grpcConfig.protoFiles || [],
      importPaths: grpcConfig.importPaths || []
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

  // Import Path handlers
  const getImportPath = async () => {
    try {
      const selectedPath = await browseDirectory(collection.pathname);
      if (selectedPath) {
        const relativePath = getRelativePath(selectedPath, collection.pathname);
        const importPathObj = {
          path: relativePath,
          enabled: true
        };
        
        // Check if this path already exists
        const exists = formik.values.importPaths.some(ip => ip.path === importPathObj.path);
        if (!exists) {
          const newImportPaths = [...formik.values.importPaths, importPathObj];
          formik.setFieldValue('importPaths', newImportPaths);
        }
      }
    } catch (error) {
      console.error('Error selecting import path:', error);
    }
  };

  // Handler for removing an import path
  const handleRemoveImportPath = (index) => {
    const updatedImportPaths = [...formik.values.importPaths];
    updatedImportPaths.splice(index, 1);
    formik.setFieldValue('importPaths', updatedImportPaths);
  };

  // Handler for toggling import path enabled state
  const handleToggleImportPath = (index) => {
    const updatedImportPaths = [...formik.values.importPaths];
    updatedImportPaths[index] = {
      ...updatedImportPaths[index],
      enabled: !updatedImportPaths[index].enabled
    };
    formik.setFieldValue('importPaths', updatedImportPaths);
  };

  // Handle the browse button click for import paths
  const handleBrowseImportPathClick = () => {
    getImportPath();
  };

  // Check if an import path is valid
  const isImportPathValid = async (importPath) => {
    try {
      const absolutePath = await resolvePath(importPath.path, collection.pathname);
      return await isDirectory(absolutePath);
    } catch (error) {
      return false;
    }
  };

  // Validate all import paths and update state
  useEffect(() => {
    const validateImportPaths = async () => {
      const validityMap = {};
      for (const path of formik.values.importPaths) {
        validityMap[path.path] = await isImportPathValid(path);
      }
      setImportPathValidity(validityMap);
    };

    validateImportPaths();
  }, [formik.values.importPaths, collection.pathname]);

  // Handle editing proto file path
  const handleEditProtoFile = (index) => {
    setEditingProtoFile(index);
  };

  const handleSaveProtoFileEdit = (index, newPath) => {
    const updatedProtoFiles = [...formik.values.protoFiles];
    updatedProtoFiles[index] = {
      ...updatedProtoFiles[index],
      path: newPath
    };
    formik.setFieldValue('protoFiles', updatedProtoFiles);
    setEditingProtoFile(null);
  };

  const handleCancelProtoFileEdit = () => {
    setEditingProtoFile(null);
  };

  // Handle editing import path
  const handleEditImportPath = (index) => {
    setEditingImportPath(index);
  };

  const handleSaveImportPathEdit = (index, newPath) => {
    const updatedImportPaths = [...formik.values.importPaths];
    updatedImportPaths[index] = {
      ...updatedImportPaths[index],
      path: newPath
    };
    formik.setFieldValue('importPaths', updatedImportPaths);
    setEditingImportPath(null);
  };

  const handleCancelImportPathEdit = () => {
    setEditingImportPath(null);
  };

  return (
    <StyledWrapper className="h-full w-full">
      <form className="bruno-form" onSubmit={formik.handleSubmit}>
        {/* Hidden file input for file selection */}
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          accept=".proto"
          multiple
          onChange={handleFileInputChange}
        />

        {/* Proto Files Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <label className="font-semibold text-sm flex items-center" htmlFor="protoFiles">
                Proto Files ({formik.values.protoFiles.length})
                <span id="proto-files-tooltip" className="ml-2">
                  <IconAlertCircle size={16} className="text-gray-500 cursor-pointer" />
                </span>
                <Tooltip
                  anchorId="proto-files-tooltip"
                  className="tooltip-mod font-normal"
                  html="Keep your proto files within the collection folder or the corresponding git repository to ensure paths remain valid when sharing the collection."
                />
              </label>
            </div>
          </div>

          {formik.values.protoFiles.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 dark:bg-gray-800/50 rounded border-2 border-dashed border-gray-300 dark:border-gray-600">
              <IconFile size={32} className="mx-auto text-gray-400 mb-3" />
              <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">No proto files added</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                Add proto files to enable gRPC functionality
              </p>
            </div>
          ) : (
            <div>
              {formik.values.protoFiles.some(file => !protoFileValidity[file.path]) && (
                <div className="text-xs text-red-500 mb-2 flex items-center bg-red-50 dark:bg-red-900/20 p-2 rounded">
                  <IconAlertCircle size={14} className="mr-1" />
                  Some proto files cannot be found. Use the edit or replace options to update their locations.
                </div>
              )}
              
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border border-gray-200 dark:border-gray-700 px-3 py-2">
                      File
                    </th>
                    <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border border-gray-200 dark:border-gray-700 px-3 py-2">
                      Path
                    </th>
                    <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border border-gray-200 dark:border-gray-700 px-3 py-2">
                      Status
                    </th>
                    <th className="text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border border-gray-200 dark:border-gray-700 px-3 py-2">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {formik.values.protoFiles.map((file, index) => {
                    const isValid = protoFileValidity[file.path];
                    const isEditing = editingProtoFile === index;
                    
                    return (
                      <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="border border-gray-200 dark:border-gray-700 px-3 py-2">
                          <div className="flex items-center">
                            <IconFile size={16} className="text-blue-500 mr-2" />
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {getBasename(file.path)}
                            </span>
                          </div>
                        </td>
                        <td className="border border-gray-200 dark:border-gray-700 px-3 py-2">
                          {isEditing ? (
                            <input
                              type="text"
                              defaultValue={file.path}
                              className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleSaveProtoFileEdit(index, e.target.value);
                                } else if (e.key === 'Escape') {
                                  handleCancelProtoFileEdit();
                                }
                              }}
                              autoFocus
                            />
                          ) : (
                            <div className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                              {file.path}
                            </div>
                          )}
                        </td>
                        <td className="border border-gray-200 dark:border-gray-700 px-3 py-2">
                          <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                            isValid 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' 
                              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                          }`}>
                            {isValid ? 'Valid' : 'Not Found'}
                          </span>
                        </td>
                        <td className="border border-gray-200 dark:border-gray-700 px-3 py-2 text-right">
                          <div className="flex items-center justify-end space-x-1">
                            {isEditing ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleSaveProtoFileEdit(index, document.querySelector(`input[defaultValue="${file.path}"]`)?.value || file.path)}
                                  className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 p-1 rounded hover:bg-green-50 dark:hover:bg-green-900/20"
                                  title="Save changes"
                                >
                                  <IconCheck size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={handleCancelProtoFileEdit}
                                  className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300 p-1 rounded hover:bg-gray-50 dark:hover:bg-gray-700"
                                  title="Cancel editing"
                                >
                                  <IconX size={14} />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleEditProtoFile(index)}
                                  className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                  title="Edit path"
                                >
                                  <IconEdit size={14} />
                                </button>
                                {!isValid && (
                                  <button
                                    type="button"
                                    onClick={() => handleReplaceProtoFile(index)}
                                    className="text-orange-600 hover:text-orange-900 dark:text-orange-400 dark:hover:text-orange-300 p-1 rounded hover:bg-orange-50 dark:hover:bg-orange-900/20"
                                    title="Replace file"
                                  >
                                    <IconFileImport size={14} />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveProtoFile(index)}
                                  className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                                  title="Remove file"
                                >
                                  <IconTrash size={14} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <button type="button" className="btn-add-param text-link pr-2 py-3 mt-2 select-none" onClick={handleBrowseClick}>
                + Add Proto File
              </button>
            </div>
          )}
        </div>

        {/* Import Paths Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <label className="font-semibold text-sm flex items-center" htmlFor="importPaths">
                Import Paths ({formik.values.importPaths.length})
                <span id="import-paths-tooltip" className="ml-2">
                  <IconAlertCircle size={16} className="text-gray-500 cursor-pointer" />
                </span>
                <Tooltip
                  anchorId="import-paths-tooltip"
                  className="tooltip-mod font-normal"
                  html="Add directories that contain proto files to be imported. These paths help resolve import statements in your proto files."
                />
              </label>
            </div>
          </div>

          {formik.values.importPaths.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 dark:bg-gray-800/50 rounded border-2 border-dashed border-gray-300 dark:border-gray-600">
              <IconFolder size={32} className="mx-auto text-gray-400 mb-3" />
              <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">No import paths added</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                Add directories to help resolve import statements
              </p>
            </div>
          ) : (
            <div>
              {formik.values.importPaths.some(path => !importPathValidity[path.path]) && (
                <div className="text-xs text-red-500 mb-2 flex items-center bg-red-50 dark:bg-red-900/20 p-2 rounded">
                  <IconAlertCircle size={14} className="mr-1" />
                  Some import paths cannot be found at their specified locations.
                </div>
              )}
              
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border border-gray-200 dark:border-gray-700 px-3 py-2">
                      Directory
                    </th>
                    <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border border-gray-200 dark:border-gray-700 px-3 py-2">
                      Path
                    </th>
                    <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border border-gray-200 dark:border-gray-700 px-3 py-2">
                      Status
                    </th>
                    <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border border-gray-200 dark:border-gray-700 px-3 py-2">
                      Enabled
                    </th>
                    <th className="text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border border-gray-200 dark:border-gray-700 px-3 py-2">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {formik.values.importPaths.map((importPath, index) => {
                    const isValid = importPathValidity[importPath.path];
                    const isEditing = editingImportPath === index;
                    
                    return (
                      <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="border border-gray-200 dark:border-gray-700 px-3 py-2">
                          <div className="flex items-center">
                            <IconFolder size={16} className="text-green-500 mr-2" />
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {getBasename(importPath.path)}
                            </span>
                          </div>
                        </td>
                        <td className="border border-gray-200 dark:border-gray-700 px-3 py-2">
                          {isEditing ? (
                            <input
                              type="text"
                              defaultValue={importPath.path}
                              className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-green-500 dark:bg-gray-700 dark:text-gray-100"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleSaveImportPathEdit(index, e.target.value);
                                } else if (e.key === 'Escape') {
                                  handleCancelImportPathEdit();
                                }
                              }}
                              autoFocus
                            />
                          ) : (
                            <div className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                              {importPath.path}
                            </div>
                          )}
                        </td>
                        <td className="border border-gray-200 dark:border-gray-700 px-3 py-2">
                          <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                            isValid 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' 
                              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                          }`}>
                            {isValid ? 'Valid' : 'Not Found'}
                          </span>
                        </td>
                        <td className="border border-gray-200 dark:border-gray-700 px-3 py-2">
                          <label className="inline-flex items-center">
                            <input
                              type="checkbox"
                              checked={importPath.enabled}
                              onChange={() => handleToggleImportPath(index)}
                              className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 dark:border-gray-600 rounded"
                            />
                            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                              {importPath.enabled ? 'Enabled' : 'Disabled'}
                            </span>
                          </label>
                        </td>
                        <td className="border border-gray-200 dark:border-gray-700 px-3 py-2 text-right">
                          <div className="flex items-center justify-end space-x-1">
                            {isEditing ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleSaveImportPathEdit(index, document.querySelector(`input[defaultValue="${importPath.path}"]`)?.value || importPath.path)}
                                  className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 p-1 rounded hover:bg-green-50 dark:hover:bg-green-900/20"
                                  title="Save changes"
                                >
                                  <IconCheck size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={handleCancelImportPathEdit}
                                  className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300 p-1 rounded hover:bg-gray-50 dark:hover:bg-gray-700"
                                  title="Cancel editing"
                                >
                                  <IconX size={14} />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleEditImportPath(index)}
                                  className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                  title="Edit path"
                                >
                                  <IconEdit size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveImportPath(index)}
                                  className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                                  title="Remove import path"
                                >
                                  <IconTrash size={14} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <button type="button" className="btn-add-param text-link pr-2 py-3 mt-2 select-none" onClick={handleBrowseImportPathClick}>
                + Add Import Path
              </button>
            </div>
          )}
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