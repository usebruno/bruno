import React, { useState, useRef } from 'react';
import { IconFileImport } from '@tabler/icons';
import { toastError } from 'utils/common/error';
import jsyaml from 'js-yaml';
import { isPostmanCollection } from 'utils/importers/postman-collection';
import { isInsomniaCollection } from 'utils/importers/insomnia-collection';
import { isOpenApiSpec } from 'utils/importers/openapi-collection';
import { isWSDLCollection } from 'utils/importers/wsdl-collection';
import { isBrunoCollection } from 'utils/importers/bruno-collection';
import { isOpenCollection } from 'utils/importers/opencollection';
import { useTheme } from 'providers/Theme';

const convertFileToObject = async (file) => {
  const text = await file.text();

  // Handle WSDL files - return as plain text
  if (file.name.endsWith('.wsdl') || file.type === 'text/xml' || file.type === 'application/xml') {
    return text;
  }

  try {
    if (file.type === 'application/json' || file.name.endsWith('.json')) {
      return JSON.parse(text);
    }

    const parsed = jsyaml.load(text);
    if (typeof parsed !== 'object' || parsed === null) {
      throw new Error();
    }
    return parsed;
  } catch {
    throw new Error('Failed to parse the file – ensure it is valid JSON or YAML');
  }
};

const FileTab = ({
  setIsLoading,
  handleSubmit,
  setErrorMessage
}) => {
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);
  const { theme } = useTheme();

  const acceptedFileTypes = [
    '.json',
    '.yaml',
    '.yml',
    '.wsdl',
    '.zip',
    'application/json',
    'application/yaml',
    'application/x-yaml',
    'application/zip',
    'application/x-zip-compressed',
    'text/xml',
    'application/xml'
  ];

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

  const processZipFile = async (zipFile) => {
    setIsLoading(true);
    try {
      const filePath = window.ipcRenderer.getFilePath(zipFile);
      const isBrunoZip = await window.ipcRenderer.invoke('renderer:is-bruno-collection-zip', filePath);

      if (isBrunoZip) {
        const collectionName = zipFile.name.replace(/\.zip$/i, '');
        await handleSubmit({ rawData: { zipFilePath: filePath, collectionName }, type: 'bruno-zip' });
        return;
      }

      toastError(new Error('The ZIP file is not a valid Bruno collection'));
    } catch (err) {
      toastError(err, 'Import ZIP file failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMultipleFiles = async (fileArray) => {
    setIsLoading(true);
    try {
      const filesData = [];

      // Parse all files
      for (const file of fileArray) {
        try {
          const data = await convertFileToObject(file);

          // Determine type for each file
          let type = null;
          if (isOpenApiSpec(data)) {
            type = 'openapi';
          } else if (isWSDLCollection(data)) {
            type = 'wsdl';
          } else if (isPostmanCollection(data)) {
            type = 'postman';
          } else if (isInsomniaCollection(data)) {
            type = 'insomnia';
          } else if (isOpenCollection(data)) {
            type = 'opencollection';
          } else if (isBrunoCollection(data)) {
            type = 'bruno';
          }

          if (type) {
            filesData.push({ file, data, type });
          }
        } catch (err) {
          console.warn(`Failed to process file ${file.name}:`, err);
        }
      }

      if (filesData.length > 0) {
        // Pass raw filesData to be processed in BulkImportCollectionLocation
        handleSubmit({ filesData, type: 'multiple' });
      } else {
        throw new Error('No valid collections found in the selected files');
      }
    } catch (err) {
      toastError(err, 'Import multiple files failed');
    } finally {
      setIsLoading(false);
    }
  };

  const processFile = async (file) => {
    setIsLoading(true);
    try {
      const data = await convertFileToObject(file);

      if (!data) {
        throw new Error('Failed to parse file content');
      }

      let type = null;

      if (isOpenApiSpec(data)) {
        type = 'openapi';
      } else if (isWSDLCollection(data)) {
        type = 'wsdl';
      } else if (isPostmanCollection(data)) {
        type = 'postman';
      } else if (isInsomniaCollection(data)) {
        type = 'insomnia';
      } else if (isOpenCollection(data)) {
        type = 'opencollection';
      } else if (isBrunoCollection(data)) {
        type = 'bruno';
      } else {
        throw new Error('Unsupported collection format');
      }

      if (type === 'openapi') {
        const filePath = window.ipcRenderer.getFilePath(file);
        const rawContent = await file.text();
        await handleSubmit({ rawData: data, type, filePath, rawContent });
      } else {
        await handleSubmit({ rawData: data, type });
      }
    } catch (err) {
      toastError(err, 'Import collection failed');
    } finally {
      setIsLoading(false);
    }
  };

  const processFiles = async (files) => {
    setErrorMessage('');

    const fileArray = Array.from(files);
    const zipFiles = fileArray.filter((file) => file.name.endsWith('.zip'));

    // If both ZIP and non-ZIP files are selected, show error
    if (zipFiles.length && (fileArray.length - zipFiles.length > 0)) {
      setErrorMessage('Cannot mix ZIP files with other file types. Please select either a single ZIP file OR collection files (JSON/YAML)');
      return;
    }

    if (zipFiles.length > 1) {
      setErrorMessage('Multiple ZIP files selected. Please select only one ZIP file at a time for import.');
      return;
    }

    if (zipFiles.length) {
      await processZipFile(zipFiles[0]);
      return;
    }

    if (fileArray.length > 1) {
      // Process multiple non-ZIP files normally
      await handleMultipleFiles(fileArray);
    } else if (fileArray.length === 1) {
      await processFile(fileArray[0]);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processFiles(e.dataTransfer.files);
    }
  };

  const handleBrowseFiles = () => {
    setErrorMessage('');
    fileInputRef.current.click();
  };

  const handleFileInputChange = async (e) => {
    if (e.target.files && e.target.files.length > 0) {
      await processFiles(e.target.files);
      e.target.value = '';
    }
  };

  return (
    <div className="mb-4">
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-lg p-6 transition-colors duration-200
          ${dragActive
      ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/20'
      : 'border-gray-200 dark:border-gray-700'
    }
        `}
      >
        <div className="flex flex-col items-center justify-center">
          <IconFileImport
            size={28}
            className="text-gray-400 dark:text-gray-500 mb-3"
          />
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            multiple
            onChange={handleFileInputChange}
            accept={acceptedFileTypes.join(',')}
          />
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
            Drop file(s) to import or{' '}
            <button
              className="underline cursor-pointer"
              onClick={handleBrowseFiles}
              style={{ color: theme.textLink }}
            >
              choose file(s)
            </button>
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            Supports Bruno, OpenCollection, Postman, Insomnia, OpenAPI v3, WSDL, and ZIP formats
          </p>
        </div>
      </div>
    </div>
  );
};

export default FileTab;
