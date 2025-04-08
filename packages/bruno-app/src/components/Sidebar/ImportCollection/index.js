import React from 'react';
import importBrunoCollection from 'utils/importers/bruno-collection';
import importPostmanCollection from 'utils/importers/postman-collection';
import importInsomniaCollection from 'utils/importers/insomnia-collection';
import importOpenapiCollection from 'utils/importers/openapi-collection';
import { toastError } from 'utils/common/error';
import Modal from 'components/Modal';

const ImportCollection = ({ onClose, handleSubmit }) => {
  const handleImportBrunoCollection = () => {
    importBrunoCollection()
      .then(({ collection }) => {
        handleSubmit({ collection });
      })
      .catch((err) => toastError(err, 'Import collection failed'));
  };

  const handleImportPostmanCollection = () => {
    importPostmanCollection()
      .then(({ collection }) => {
        handleSubmit({ collection });
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
      </div>
    </Modal>
  );
};

export default ImportCollection;
