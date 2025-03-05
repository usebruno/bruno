import React, { useState } from 'react';
import { IconDownload } from '@tabler/icons';
import importBrunoCollection from 'utils/importers/bruno-collection';
import importPostmanCollection from 'utils/importers/postman-collection';
import importInsomniaCollection from 'utils/importers/insomnia-collection';
import importOpenapiCollection from 'utils/importers/openapi-collection';
import { toastError } from 'utils/common/error';
import Modal from 'components/Modal';
import Bruno from 'components/Bruno/index';
import OpenApiLogo from 'components/Icons/OpenAPILogo/index';

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
      .then(({ collection, translationLog }) => {
        handleSubmit({ collection, translationLog });
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

  return (
    <Modal size="sm" title="Import Collection" hideFooter={true} handleCancel={onClose}>
      <div className="flex flex-col">
        <h3 className="text-sm">Select the type of your existing collection :</h3>
        <div className="space-y-2 mt-4"> 
            <div className="flex items-center p-3 rounded-lg transition-colors cursor-pointer border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-500/10" onClick={handleImportBrunoCollection}>
              <div className="icon-container mr-3 p-1 rounded-full">
                <Bruno width={28} />
              </div>
              <div className="flex-1">
                <div className="font-medium">Bruno Collection</div>
                <div className="text-xs">Pick a Bruno collection JSON file.</div>
              </div>
            </div>

            <div className="flex items-center p-3 rounded-lg transition-colors cursor-pointer border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-500/10" onClick={handleImportInsomniaCollection}>
              <div className="icon-container mr-3 p-1 rounded-full">
                <IconDownload size={28} strokeWidth={1} />
              </div>
              <div className="flex-1">
                <div className="font-medium">Insomnia Collection</div>
                <div className="text-xs">Pick a Insomnia collection JSON file.</div>
              </div>
            </div>
            
            <div className="flex items-center p-3 rounded-lg transition-colors cursor-pointer border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-500/10" onClick={handleImportPostmanCollection}>
              <div className="icon-container mr-3 p-1 rounded-full">
                <IconDownload size={28} strokeWidth={1} />
              </div>
              <div className="flex-1">
                <div className="font-medium">Postman Collection</div>
                <div className="text-xs">Pick a Postman collection JSON file.</div>
              </div>
            </div>
            
            <div className="flex items-center p-3 rounded-lg transition-colors cursor-pointer border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-500/10" onClick={handleImportOpenapiCollection}>
              <div className="icon-container mr-3 p-1 rounded-full">
                <OpenApiLogo />
              </div>
              <div className="flex-1">
                <div className="font-medium">OpenAPI v3 Collection</div>
                <div className="text-xs">Pick an OpenAPI v3 JSON/YAML spec file.</div>
              </div>
            </div>
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
