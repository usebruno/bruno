import React, { useState, useEffect, useRef, forwardRef } from 'react';
import { IconLoader2, IconFileImport, IconCaretDown } from '@tabler/icons';
import { toastError } from 'utils/common/error';
import Modal from 'components/Modal';
import Dropdown from 'components/Dropdown';
import jsyaml from 'js-yaml';
import { postmanToBruno, isPostmanCollection } from 'utils/importers/postman-collection';
import { convertInsomniaToBruno, isInsomniaCollection } from 'utils/importers/insomnia-collection';
import { convertOpenapiToBruno, isOpenApiSpec } from 'utils/importers/openapi-collection';
import { processBrunoCollection } from 'utils/importers/bruno-collection';
import StyledWrapper from './StyledWrapper';

const convertFileToObject = async (file) => {
  const text = await file.text();

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
  const [showOpenApiSettings, setShowOpenApiSettings] = useState(false);
  const [pendingOpenApiData, setPendingOpenApiData] = useState(null);
  const [groupingType, setGroupingType] = useState('tags');
  const fileInputRef = useRef(null);
  const dropdownTippyRef = useRef();

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

  const processFile = async (file) => {
    setIsLoading(true);
    try {
      const data = await convertFileToObject(file);

      if (!data) {
        throw new Error('Failed to parse file content');
      }

      // Check if it's an OpenAPI spec and show settings
      if (isOpenApiSpec(data)) {
        setPendingOpenApiData(data);
        setShowOpenApiSettings(true);
        setIsLoading(false);
        return;
      }

      let collection;
      
      if (isPostmanCollection(data)) {
        collection = await postmanToBruno(data);
      }
      else if (isInsomniaCollection(data)) {
        collection = convertInsomniaToBruno(data);
      }
      else {
        collection = await processBrunoCollection(data);
      }
      
      handleSubmit({ collection });
    } catch (err) {
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

  const handleImportWithSettings = async () => {
    if (!pendingOpenApiData) return;

    setIsLoading(true);
    try {
      const collection = convertOpenapiToBruno(pendingOpenApiData, { grouping: groupingType });
      handleSubmit({ collection });
    } catch (err) {
      toastError(err, 'Import collection failed');
    } finally {
      setIsLoading(false);
      setShowOpenApiSettings(false);
      setPendingOpenApiData(null);
    }
  };

  const onDropdownCreate = (ref) => (dropdownTippyRef.current = ref);

  const GroupingDropdownIcon = forwardRef((props, ref) => {
    const selectedOption = groupingOptions.find(option => option.value === groupingType);
    return (
      <div ref={ref} className="flex items-center justify-between w-full current-group">
        <div>
          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {selectedOption.label}
          </div>
        </div>
        <IconCaretDown size={16} className="text-gray-400 ml-[0.25rem]" fill="currentColor" />
      </div>
    );
  });

  if (isLoading) {
    return <FullscreenLoader isLoading={isLoading} />;
  }

  const acceptedFileTypes = [
    '.json',
    '.yaml',
    '.yml',
    'application/json',
    'application/yaml',
    'application/x-yaml'
  ];

  const groupingOptions = [
    { value: 'tags', label: 'Tags', description: 'Group requests by OpenAPI tags' },
    { value: 'path', label: 'Paths', description: 'Group requests by URL path structure' }
  ];

  return (
    <StyledWrapper>
      <Modal
        size="sm"
        title="Import Collection"
        hideFooter={!showOpenApiSettings}
        handleCancel={onClose}
        confirmText={showOpenApiSettings ? "Import" : undefined}
        handleConfirm={showOpenApiSettings ? handleImportWithSettings : undefined}
      >
        <div className="flex flex-col">
          {!showOpenApiSettings && (
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
                  accept={acceptedFileTypes.join(',')}
                />
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
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
        )}

        {showOpenApiSettings && (
          <div className="flex items-center">
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                Folder arrangement
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Select whether to create folders according to the spec's paths or tags.
              </p>
            </div>

            <div className="relative">
              <Dropdown onCreate={onDropdownCreate} icon={<GroupingDropdownIcon />} placement="bottom-start">
                {groupingOptions.map((option) => (
                  <div
                    key={option.value}
                    className="dropdown-item"
                    onClick={() => {
                      dropdownTippyRef?.current?.hide();
                      setGroupingType(option.value);
                    }}
                  >
                    {option.label}
                  </div>
                ))}
              </Dropdown>
            </div>
          </div>
        )}
        </div>
      </Modal>
    </StyledWrapper>
  );
};

export default ImportCollection;
