import React, { useState, useEffect, useRef } from 'react';
import { IconFileImport } from '@tabler/icons';
import { toastError } from 'utils/common/error';
import Modal from 'components/Modal';
import jsyaml from 'js-yaml';
import { isPostmanCollection } from 'utils/importers/postman-collection';
import { isInsomniaCollection } from 'utils/importers/insomnia-collection';
import { isOpenApiSpec } from 'utils/importers/openapi-collection';
import { isWSDLCollection } from 'utils/importers/wsdl-collection';
import { isBrunoCollection } from 'utils/importers/bruno-collection';
import FullscreenLoader from './FullscreenLoader/index';
import StyledWrapper from './StyledWrapper';

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

const ImportCollection = ({ onClose, handleSubmit }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

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

      let type = null;

      if (isOpenApiSpec(data)) {
        type = 'openapi';
      } else if (isWSDLCollection(data)) {
        type = 'wsdl';
      } else if (isPostmanCollection(data)) {
        type = 'postman';
      } else if (isInsomniaCollection(data)) {
        type = 'insomnia';
      } else if (isBrunoCollection(data)) {
        type = 'bruno';
      } else {
        throw new Error('Unsupported collection format');
      }

      handleSubmit({ rawData: data, type });
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

  if (isLoading) {
    return <FullscreenLoader isLoading={isLoading} />;
  }

  const acceptedFileTypes = [
    '.json',
    '.yaml',
    '.yml',
    '.wsdl',
    'application/json',
    'application/yaml',
    'application/x-yaml',
    'text/xml',
    'application/xml'
  ];

  return (
    <StyledWrapper>
      <Modal size="sm" title="Import Collection" hideFooter={true} handleCancel={onClose} dataTestId="import-collection-modal">
        <div className="flex flex-col">
          <div className="mb-4">
            <h3 className="import-heading font-medium mb-2">Import from file</h3>
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`drag-drop-zone border-2 border-dashed rounded-lg p-6 ${dragActive ? 'active' : ''}`}
            >
              <div className="flex flex-col items-center justify-center">
                <IconFileImport
                  size={28}
                  className="import-icon mb-3"
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileInputChange}
                  accept={acceptedFileTypes.join(',')}
                />
                <p className="import-text mb-2">
                  Drop file to import or{' '}
                  <button
                    className="text-blue-500 underline cursor-pointer"
                    onClick={handleBrowseFiles}
                  >
                    choose a file
                  </button>
                </p>
                <p className="import-description text-xs">
                  Supports Bruno, Postman, Insomnia, OpenAPI v3, and WSDL formats
                </p>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </StyledWrapper>
  );
};

export default ImportCollection;
