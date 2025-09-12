import React, { useRef } from 'react';
import StyledWrapper from './StyledWrapper';
import {
  IconTrash,
  IconFile,
  IconFileImport,
  IconAlertCircle,
  IconFolder,
} from '@tabler/icons';
import { getBasename } from 'utils/common/path';
import { Tooltip } from 'react-tooltip';
import useProtoFileManagement from '../../../hooks/useProtoFileManagement';

const ProtobufSettings = ({ collection }) => {
  const {
    protoFiles,
    importPaths,
    addProtoFileToCollection,
    addImportPathToCollection,
    toggleImportPath,
    browseForProtoFile,
    browseForImportDirectory,
    removeProtoFileFromCollection,
    removeImportPathFromCollection,
    replaceImportPathInCollection,
    replaceProtoFileInCollection,
  } = useProtoFileManagement(collection);
  const fileInputRef = useRef(null);

  // Get file path using the ipcRenderer
  const getProtoFile = async event => {
    const files = event?.files;
    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        const filePath = window?.ipcRenderer?.getFilePath(files[i]);
        if (filePath) {
          await addProtoFileToCollection(filePath);
        }
      }
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveProtoFile = async index => {
    await removeProtoFileFromCollection(index);
  };

  const handleBrowseClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleReplaceProtoFile = async index => {
    const result = await browseForProtoFile();
    if (result.success) {
      await replaceProtoFileInCollection(index, result.filePath);
    }
  };

  const handleReplaceImportPath = async index => {
    const result = await browseForImportDirectory();
    if (result.success) {
      await replaceImportPathInCollection(index, result.directoryPath);
    }
  };

  const handleFileInputChange = e => {
    getProtoFile(e.target);
  };

  const getImportPath = async () => {
    const result = await browseForImportDirectory();
    if (result.success) {
      await addImportPathToCollection(result.directoryPath);
    }
  };

  const handleRemoveImportPath = async index => {
    await removeImportPathFromCollection(index);
  };

  const handleToggleImportPath = async index => {
    await toggleImportPath(index);
  };

  const handleBrowseImportPathClick = () => {
    getImportPath();
  };

  return (
    <StyledWrapper className="h-full w-full">
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
      <div className="mb-6" data-testid="protobuf-proto-files-section">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center">
            <label className="font-semibold text-sm flex items-center" htmlFor="protoFiles">
              Proto Files (
              {protoFiles.length}
              )
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

        <div>
          {protoFiles.some(file => !file.exists) && (
            <div className="text-xs text-red-600 dark:text-red-400 mb-2 flex items-center p-2 rounded" data-testid="protobuf-invalid-files-message">
              <IconAlertCircle size={14} className="mr-1" />
              Some proto files cannot be found. Use the replace option to update their locations.
            </div>
          )}

          <table className="w-full border-collapse" data-testid="protobuf-proto-files-table">
            <thead>
              <tr>
                <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border border-gray-200 dark:border-gray-700 px-3 py-2">
                  File
                </th>
                <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border border-gray-200 dark:border-gray-700 px-3 py-2">
                  Path
                </th>
                <th className="text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border border-gray-200 dark:border-gray-700 px-3 py-2">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {protoFiles.length === 0 ? (
                <tr>
                  <td colSpan="3" className="border border-gray-200 dark:border-gray-700 px-3 py-8 text-center">
                    <div className="flex flex-col items-center">
                      <IconFile size={24} className="text-gray-400 mb-2" />
                      <span className="text-sm text-gray-500 dark:text-gray-400">No proto files added</span>
                    </div>
                  </td>
                </tr>
              ) : (
                protoFiles.map((file, index) => {
                  const isValid = file.exists;

                  return (
                    <tr key={index}>
                      <td className="border border-gray-200 dark:border-gray-700 px-3 py-2">
                        <div className="flex items-center">
                          <IconFile size={16} className="text-gray-500 dark:text-gray-400 mr-2" />
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {getBasename(collection.pathname, file.path)}
                          </span>
                          {!isValid && <IconAlertCircle size={12} className="text-red-600 dark:text-red-400 ml-2" />}
                        </div>
                      </td>
                      <td className="border border-gray-200 dark:border-gray-700 px-3 py-2">
                        <div className="text-xs text-gray-600 dark:text-gray-400 font-mono">
                          {file.path}
                        </div>
                      </td>
                      <td className="border border-gray-200 dark:border-gray-700 px-3 py-2 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          {!isValid && (
                            <button
                              type="button"
                              onClick={() => handleReplaceProtoFile(index)}
                              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-1 rounded"
                              title="Replace file"
                            >
                              <IconFileImport size={14} />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveProtoFile(index)}
                            className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300 p-1 rounded"
                            title="Remove file"
                            data-testid="protobuf-remove-file-button"
                          >
                            <IconTrash size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          <button type="button" className="btn-add-param text-link pr-2 py-3 mt-2 select-none" onClick={handleBrowseClick} data-testid="protobuf-add-file-button">
            + Add Proto File
          </button>
        </div>
      </div>

      {/* Import Paths Section */}
      <div className="mb-6" data-testid="protobuf-import-paths-section">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center">
            <label className="font-semibold text-sm flex items-center" htmlFor="importPaths">
              Import Paths (
              {importPaths.length}
              )
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

        <div>
          {importPaths.some(path => !path.exists) && (
            <div className="text-xs text-red-600 dark:text-red-400 mb-2 flex items-center p-2 rounded" data-testid="protobuf-invalid-import-paths-message">
              <IconAlertCircle size={14} className="mr-1" />
              Some import paths cannot be found at their specified locations.
            </div>
          )}

          <table className="w-full border-collapse" data-testid="protobuf-import-paths-table">
            <thead>
              <tr>
                <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border border-gray-200 dark:border-gray-700 px-3 py-2">
                </th>
                <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border border-gray-200 dark:border-gray-700 px-3 py-2">
                  Directory
                </th>
                <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border border-gray-200 dark:border-gray-700 px-3 py-2">
                  Path
                </th>
                <th className="text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border border-gray-200 dark:border-gray-700 px-3 py-2">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {importPaths.length === 0 ? (
                <tr>
                  <td colSpan="4" className="border border-gray-200 dark:border-gray-700 px-3 py-8 text-center">
                    <div className="flex flex-col items-center">
                      <IconFolder size={24} className="text-gray-400 mb-2" />
                      <span className="text-sm text-gray-500 dark:text-gray-400">No import paths added</span>
                    </div>
                  </td>
                </tr>
              ) : (
                importPaths.map((importPath, index) => {
                  const isValid = importPath.exists;

                  return (
                    <tr key={index}>
                      <td className="border border-gray-200 dark:border-gray-700 px-3 py-2">
                        <input
                          type="checkbox"
                          checked={importPath.enabled}
                          onChange={() => handleToggleImportPath(index)}
                          className="h-4 w-4 text-gray-600 focus:ring-gray-500 border-gray-300 dark:border-gray-600 rounded"
                          title={importPath.enabled ? 'Disable this import path' : 'Enable this import path'}
                          data-testid="protobuf-import-path-checkbox"
                        />
                      </td>
                      <td className="border border-gray-200 dark:border-gray-700 px-3 py-2">
                        <div className="flex items-center">
                          <IconFolder size={16} className="text-gray-500 dark:text-gray-400 mr-2" />
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {getBasename(collection.pathname, importPath.path)}
                          </span>
                          {!isValid && <IconAlertCircle size={12} className="text-red-600 dark:text-red-400 ml-2" />}
                        </div>
                      </td>
                      <td className="border border-gray-200 dark:border-gray-700 px-3 py-2">
                        <div className="text-xs text-gray-600 dark:text-gray-400 font-mono">
                          {importPath.path}
                        </div>
                      </td>
                      <td className="border border-gray-200 dark:border-gray-700 px-3 py-2 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          {!isValid && (
                            <button
                              type="button"
                              onClick={() => handleReplaceImportPath(index)}
                              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-1 rounded"
                              title="Replace directory"
                            >
                              <IconFileImport size={14} />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveImportPath(index)}
                            className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300 p-1 rounded"
                            title="Remove import path"
                            data-testid="protobuf-remove-import-path-button"
                          >
                            <IconTrash size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          <button type="button" className="btn-add-param text-link pr-2 py-3 mt-2 select-none" onClick={handleBrowseImportPathClick} data-testid="protobuf-add-import-path-button">
            + Add Import Path
          </button>
        </div>
      </div>

    </StyledWrapper>
  );
};

export default ProtobufSettings;
