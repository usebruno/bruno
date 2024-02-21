import React, { useState } from 'react';
import importBrunoCollection from 'utils/importers/bruno-collection';
import importPostmanCollection from 'utils/importers/postman-collection';
import importInsomniaCollection from 'utils/importers/insomnia-collection';
import importOpenapiCollection from 'utils/importers/openapi-collection';
import { toastError } from 'utils/common/error';
import Modal from 'components/Modal';
import { Button } from 'components/ui/button';
import { ImportCollectionOptions } from 'components/Sidebar/ImportCollection/ImportCollectionOptions';

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
  return (
    <Modal size="sm" title="Import Collection" hideFooter={true} handleConfirm={onClose} handleCancel={onClose}>
      <div className="flex flex-col">
        <h3 className="text-sm">Select the type of your existing collection :</h3>
        <div className="mt-4 grid grid-rows-2 grid-flow-col gap-2">
          <Button variant="outline" className="" onClick={handleImportBrunoCollection}>
            Bruno Collection
          </Button>
          <Button variant="outline" onClick={handleImportPostmanCollection}>
            Postman Collection
          </Button>
          <Button variant="outline" className="" onClick={handleImportInsomniaCollection}>
            Insomnia Collection
          </Button>
          <Button variant="outline" className="" onClick={handleImportOpenapiCollection}>
            OpenAPI V3 Spec
          </Button>
        </div>
        <div className="flex justify-end w-full mt-4">
          <ImportCollectionOptions options={options} setOptions={setOptions} />
        </div>
      </div>
    </Modal>
  );
};

export default ImportCollection;
