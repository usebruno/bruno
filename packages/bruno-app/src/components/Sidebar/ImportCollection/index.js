import React, { useState } from 'react';
import importBrunoCollection from 'utils/importers/bruno-collection';
import importPostmanCollection from 'utils/importers/postman-collection';
import importInsomniaCollection from 'utils/importers/insomnia-collection';
import importOpenapiCollection from 'utils/importers/openapi-collection';
import { toastError } from 'utils/common/error';
import Modal from 'components/Modal';

const ImportCollection = ({ onClose, handleSubmit }) => {
  const [options, setOptions] = useState({
    enablePostmanTranslations: {
      enabled: true,
      label: 'Enable Postman translations',
    }
  })
  const handleImportBrunoCollection = () => {
    importBrunoCollection()
      .then((collection) => {
        handleSubmit(collection);
      })
      .catch((err) => toastError(err, 'Import collection failed'));
  };

  const handleImportPostmanCollection = () => {
    importPostmanCollection(options)
      .then((collection) => {
        handleSubmit(collection);
      })
      .catch((err) => toastError(err, 'Postman Import collection failed'));
  };

  const handleImportInsomniaCollection = () => {
    importInsomniaCollection()
      .then((collection) => {
        handleSubmit(collection);
      })
      .catch((err) => toastError(err, 'Insomnia Import collection failed'));
  };

  const handleImportOpenapiCollection = () => {
    importOpenapiCollection()
      .then((collection) => {
        handleSubmit(collection);
      })
      .catch((err) => toastError(err, 'OpenAPI v3 Import collection failed'));
  };
  const toggleOptions = (event, optionKey) => {
    setOptions({ ...options, [optionKey]: {
        ...options[optionKey],
        enabled: !options[optionKey].enabled
      } });
  };
  return (
    <Modal size="sm" title="Import Collection" hideFooter={true} handleConfirm={onClose} handleCancel={onClose}>
      <div className="flex flex-col">
        <h3 className="text-sm">Select the type of your existing collection :</h3>
        <div className="mt-4 grid grid-rows-2 grid-flow-col gap-2">
          <button variant="outline" className="" onClick={handleImportBrunoCollection}>
            Bruno Collection
          </button>
          <button variant="outline" onClick={handleImportPostmanCollection}>
            Postman Collection
          </button>
          <button variant="outline" className="" onClick={handleImportInsomniaCollection}>
            Insomnia Collection
          </button>
          <button variant="outline" className="" onClick={handleImportOpenapiCollection}>
            OpenAPI V3 Spec
          </button>
        </div>
        <div className="flex justify-end w-full mt-4">
          {Object.entries(options || {}).map(([key, option]) => (
            <div className="relative flex items-start">
              <div className="flex h-6 items-center">
                <input
                  id="comments"
                  aria-describedby="comments-description"
                  name="comments"
                  type="checkbox"
                  value={option.enabled}
                  onChange={(e) => toggleOptions(e,key)}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                />
              </div>
              <div className="ml-3 text-sm leading-6">
                <label htmlFor="comments" className="font-medium text-gray-900">
                  {option.label}
                </label>
                <p id="comments-description" className="text-gray-500">
                  Get notified when someones posts a comment on a posting.
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
};

export default ImportCollection;
