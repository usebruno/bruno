import React, { useState, useEffect } from 'react';
import { IconLoader2 } from '@tabler/icons';
import importBrunoCollection from 'utils/importers/bruno-collection';
import { postmanToBruno, readFile } from 'utils/importers/postman-collection';
import importInsomniaCollection from 'utils/importers/insomnia-collection';
import importOpenapiCollection from 'utils/importers/openapi-collection';
import { toastError } from 'utils/common/error';
import Modal from 'components/Modal';
import fileDialog from 'file-dialog';
const ImportCollection = ({ onClose, handleSubmit }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  
  // Messages to cycle through while loading
  const loadingMessages = [
    'Processing collection...',
    'Analyzing requests...',
    'Translating scripts...',
    'Preparing collection...',
    'Almost done...'
  ];
  
  
  // Cycle through loading messages for better UX
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

  const handleImportBrunoCollection = () => {
    importBrunoCollection()
      .then(({ collection }) => {
        handleSubmit({ collection });
      })
      .catch((err) => toastError(err, 'Import collection failed'))
  };


  const handleImportPostmanCollection = () => {
    fileDialog({ accept: 'application/json' })
      .then((...args) => {
        setIsLoading(true);
        return readFile(...args);
      })
      .then((collection) => postmanToBruno(collection))
      .then((collection) => handleSubmit({ collection }))
      .catch((err) => toastError(err, 'Postman Import collection failed'))
      .finally(() => setIsLoading(false));
  }

  const handleImportInsomniaCollection = () => {
    importInsomniaCollection()
      .then(({ collection }) => {
        handleSubmit({ collection });
      })
      .catch((err) => toastError(err, 'Insomnia Import collection failed'))
  };

  const handleImportOpenapiCollection = () => {
    importOpenapiCollection()
      .then(({ collection }) => {
        handleSubmit({ collection });
      })
      .catch((err) => toastError(err, 'OpenAPI v3 Import collection failed'))
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
  
  const FullscreenLoader = () => {
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
  
  return (
    <>
      {isLoading && <FullscreenLoader />}
      {!isLoading && (
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
      )}
    </>
  );
};

export default ImportCollection;
