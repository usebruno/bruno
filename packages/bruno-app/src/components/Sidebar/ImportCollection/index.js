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
      label: 'Auto translate postman scripts',
      subLabel:
        "When enabled, Bruno will try as best to translate the scripts from the imported collection to Bruno's format."
    }
  });
  const handleImportBrunoCollection = () => {
    importBrunoCollection()
      .then(({ collection }) => {
        handleSubmit({ collection });
      })
      .catch((err) => toastError(err, 'Import collection failed'));
  };

  const handleImportPostmanCollection = () => {
    importPostmanCollection(options)
      .then(({ collection, translationLog, importSummary }) => {
        handleSubmit({ collection, translationLog, importSummary });
      })
      .catch((err) => toastError(err, 'Postman Import collection failed'));
  };

  const handleImportInsomniaCollection = () => {
    importInsomniaCollection()
      .then(({ collection }) => {
        handleSubmit({ collection });
      })
      .catch((err) => toastError(err, 'Insomnia Import collection failed'));
  };

  const handleImportOpenapiCollection = () => {
    importOpenapiCollection()
      .then(({ collection }) => {
        handleSubmit({ collection });
      })
      .catch((err) => toastError(err, 'OpenAPI v3 Import collection failed'));
  };
  const toggleOptions = (event, optionKey) => {
    setOptions({
      ...options,
      [optionKey]: {
        ...options[optionKey],
        enabled: !options[optionKey].enabled
      }
    });
  };
  const CollectionButton = ({ children, className, onClick }) => {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`rounded bg-transparent px-2.5 py-1 text-xs font-semibold text-zinc-900 dark:text-zinc-50 shadow-sm ring-1 ring-inset ring-zinc-300 dark:ring-zinc-500 hover:bg-gray-50 dark:hover:bg-zinc-700
        ${className}`}
      >
        {children}
      </button>
    );
  };
  return (
    <Modal size="sm" title="Import Collection" hideFooter={true} handleCancel={onClose}>
      <div className="flex flex-col">
        <h3 className="text-sm">Select the type of your existing collection :</h3>
        <div className="mt-4 grid grid-rows-2 grid-flow-col gap-2">
          <CollectionButton onClick={handleImportBrunoCollection}>Bruno Collection</CollectionButton>
          <CollectionButton onClick={handleImportPostmanCollection}>Postman Collection</CollectionButton>
          <CollectionButton onClick={handleImportInsomniaCollection}>Insomnia Collection</CollectionButton>
          <CollectionButton onClick={handleImportOpenapiCollection}>OpenAPI V3 Spec</CollectionButton>
        </div>
        <div className="flex justify-start w-full mt-4 max-w-[450px]">
          {Object.entries(options || {}).map(([key, option]) => (
            <div key={key} className="relative flex items-start">
              <div className="flex h-6 items-center">
                <input
                  id="comments"
                  aria-describedby="comments-description"
                  name="comments"
                  type="checkbox"
                  checked={option.enabled}
                  onChange={(e) => toggleOptions(e, key)}
                  className="h-3.5 w-3.5 rounded border-zinc-300 dark:ring-offset-zinc-800 bg-transparent text-indigo-600 dark:text-indigo-500 focus:ring-indigo-600 dark:focus:ring-indigo-500"
                />
              </div>
              <div className="ml-2 text-sm leading-6">
                <label htmlFor="comments" className="font-medium text-gray-900 dark:text-zinc-50">
                  {option.label}
                </label>
                <p id="comments-description" className="text-zinc-500 text-xs dark:text-zinc-400">
                  {option.subLabel}
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
