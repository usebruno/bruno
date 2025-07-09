import React, { useState, useEffect, useRef } from 'react';
import { IconLoader2, IconFileImport } from '@tabler/icons';
import { toastError } from 'utils/common/error';
import Modal from 'components/Modal';
import jsyaml from 'js-yaml';
import { postmanToBruno } from 'utils/importers/postman-collection';
import { convertInsomniaToBruno } from 'utils/importers/insomnia-collection';
import { convertOpenapiToBruno } from 'utils/importers/openapi-collection';
import { processBrunoCollection } from 'utils/importers/bruno-collection';

const isInsomniaCollection = (data) => {
  if (data?.type?.startsWith('collection.insomnia.rest/5')) {
    return true;
  }

  if (data?._type === 'export' && Array.isArray(data.resources)) {
    return true;
  }

  return false;
};

const convertFileToObject = async (file) => {
  const text = await file.text();

  try {
    const parsed = jsyaml.load(text);
    if (typeof parsed !== 'object' || parsed === null) {
      throw new Error();
    }
    return parsed;
  } catch {
    throw new Error('Failed to parse the file – ensure it is valid JSON or YAML');
  }
};

const FullscreenLoader = ({ isLoading }) => {
  const [loadingMessage, setLoadingMessage] = useState('');

  // Messages to cycle through while loading
  const loadingMessages = [
    'Processing collection...',
    'Analyzing requests...',
    'Translating scripts...',
    'Preparing collection...',
    'Almost done...'
  ];

  useEffect(() => {
    if (!isLoading) return;

    let messageIndex = 0;
    const interval = setInterval(() => {
      messageIndex = (messageIndex + 1) % loadingMessages.length;
      setLoadingMessage(loadingMessages[messageIndex]);
    }, 2000);

    setLoadingMessage(loadingMessages[0]);

    return () => clearInterval(interval);
  }, [isLoading]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm transition-all duration-300">
      <div className="flex flex-col items-center p-8 rounded-lg bg-white dark:bg-zinc-800 shadow-lg max-w-md text-center">
        <IconLoader2 className="animate-spin h-12 w-12 mb-4" strokeWidth={1.5} />
        <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-50 mb-2">
          {loadingMessage}
        </h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          This may take a moment depending on the collection size
        </p>
      </div>
    </div>
  );
};

const ImportCollection = ({ onClose, handleSubmit }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  // Add global drag event listeners
  useEffect(() => {
    const handleDocumentDragOver = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleDocumentDrop = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };

    document.addEventListener('dragover', handleDocumentDragOver);
    document.addEventListener('drop', handleDocumentDrop);

    return () => {
      document.removeEventListener('dragover', handleDocumentDragOver);
      document.removeEventListener('drop', handleDocumentDrop);
    };
  }, []);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }
    
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFile = async (file) => {
    setIsLoading(true);
    try {
      const data = await convertFileToObject(file);
      
      if (!data) {
        throw new Error("Failed to parse file content");
      }
      
      let collection;
      
      if (data.info?.schema?.includes('postman') || 
          data.info?._postman_id) {
        collection = await postmanToBruno(data);
      } 
      else if (isInsomniaCollection(data)) {
        collection = convertInsomniaToBruno(data);
      }
      else if (data.openapi || data.swagger) {
        collection = convertOpenapiToBruno(data);
      } 
      else {
        collection = await processBrunoCollection(data);
      }
      
      handleSubmit({ collection });
    } catch (err) {
      console.error("Error processing file:", err);
      toastError(err, 'Import collection failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processFile(e.dataTransfer.files[0]);
    }
  };

  const handleBrowseFiles = () => {
    fileInputRef.current.click();
  };

  const handleFileInputChange = async (e) => {
    if (e.target.files && e.target.files[0]) {
      await processFile(e.target.files[0]);
    }
  };

  if (isLoading) {
    return <FullscreenLoader isLoading={isLoading} />;
  }

  return (
    <Modal size="sm" title="Import Collection" hideFooter={true} handleCancel={onClose}>
      <div className="flex flex-col">
          <div className="mb-4">
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Import from file</h3>
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
                onChange={handleFileInputChange}
                accept=".json,.yaml,.yml,application/json,application/yaml,application/x-yaml"
              />
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">
                Drop file to import or{' '}
                <button
                  className="text-blue-500 underline cursor-pointer"
                  onClick={handleBrowseFiles}
                >
                  choose a file
                </button>
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
