import React, { useState, useCallback } from 'react';
import { IconInfoCircle } from '@tabler/icons';
import importBrunoCollection from 'utils/importers/bruno-collection';
import importPostmanCollection from 'utils/importers/postman-collection';
import importInsomniaCollection from 'utils/importers/insomnia-collection';
import importOpenapiCollection from 'utils/importers/openapi-collection';
import { toastError } from 'utils/common/error';
import Modal from 'components/Modal';

const ImportCollection = ({ onClose, handleSubmit }) => {
  const [isDragging, setIsDragging] = useState(false);

  const processFile = async (file) => {
    if (!file) return;

    try {
      const fileContent = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsText(file);
      });

      let data;
      try {
        data = JSON.parse(fileContent);
        console.log(data);
      } catch (e) {
        toastError(new Error('Invalid file format. Please select a valid collection file.'));
        return;
      }

      if (data.info?.schema?.includes('postman')) {
        const result = await importPostmanCollection(file);
        handleSubmit(result);
      } else if (data.openapi) {
        const result = await importOpenapiCollection(file);
        handleSubmit(result);
      } else if (data.resources) {
        const result = await importInsomniaCollection(file);
        handleSubmit(result);
      } else if (data.brunoConfig) {
        const result = await importBrunoCollection(file);
        handleSubmit(result);
      } else {
        toastError(new Error('Unsupported file format'));
      }
    } catch (err) {
      toastError(err, 'Import collection failed');
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  }, []);

  return (
    <Modal size="sm" title="Import Collection" hideFooter={true} handleCancel={onClose}>
      <div className="flex flex-col">
        <div className="flex items-center gap-2 p-3 mb-6 bg-yellow-50 dark:bg-yellow-900/30 rounded-md">
          <IconInfoCircle 
            size={20} 
            className="text-amber-700 dark:text-amber-500 flex-shrink-0" 
          />
          <span className="text-amber-700 dark:text-amber-500 text-sm">
            Postman Data Dump, Clone Git Repository
          </span>
        </div>

        <div className="mb-4">
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Import from file</h3>
          <div
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              border-2 border-dashed rounded-lg p-6 transition-colors duration-200
              ${isDragging 
                ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/20' 
                : 'border-gray-200 dark:border-gray-700'
              }
            `}
          >
            <div className="flex flex-col items-center justify-center">
              <input
                type="file"
                id="file-input"
                className="hidden"
                onChange={handleFileSelect}
                accept=".json,.yaml,.yml"
              />
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">
                Drop file to import or{' '}
                <label 
                  htmlFor="file-input" 
                  className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 cursor-pointer"
                >
                  choose a file
                </label>
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Supports Bruno, Postman, Insomnia, and OpenAPI v3 formats
              </p>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default ImportCollection;
