import { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import BulkImportCollectionLocation from 'components/Sidebar/BulkImportCollectionLocation';
import ImportCollectionLocation from 'components/Sidebar/ImportCollectionLocation';
import PostmanPackageReport from 'components/Sidebar/PostmanPackageReport';
import usePostmanPackagePrompt from 'hooks/usePostmanPackagePrompt';
import { importCollection, importCollectionFromZip } from 'providers/ReduxStore/slices/collections/actions';
import { closeOpenCollectionModal } from 'providers/ReduxStore/slices/open-collection-modal/actions';
import { formatIpcError } from 'utils/common/error';
import { isDirectory } from 'utils/filesystem';
import { ImportHandoffContext } from './context';

const reportFailedImport = async (collectionLocation) => {
  const isFolder = await isDirectory(collectionLocation);
  toast.error(isFolder ? 'Failed to import the collection' : `Failed to import the collection: ${collectionLocation} is not an existing folder`);
};

const ImportHandoff = ({ children }) => {
  const dispatch = useDispatch();
  const [importData, setImportData] = useState(null);
  const isImportingRef = useRef(false);
  const { postmanPackagePrompt, clearPostmanPackagePrompt, handleImportResolved } = usePostmanPackagePrompt();

  const importFrom = useCallback(async (loadImportData) => {
    const loaded = await dispatch(loadImportData);
    if (loaded) {
      setImportData(loaded);
      dispatch(closeOpenCollectionModal());
    }
  }, [dispatch]);

  useEffect(() => {
    if (importData) {
      document.getElementById('collection-location')?.focus();
    }
  }, [importData]);

  const closeImport = () => setImportData(null);

  const importToLocation = (convertedCollection, collectionLocation, options = {}) => {
    if (isImportingRef.current) {
      return;
    }
    isImportingRef.current = true;

    const importAction = options.isZipImport
      ? importCollectionFromZip(convertedCollection.zipFilePath, collectionLocation)
      : importCollection(convertedCollection, collectionLocation, options);

    dispatch(importAction)
      .then((importedItem) => {
        if (!importedItem) {
          return reportFailedImport(collectionLocation);
        }
        closeImport();
        handleImportResolved(convertedCollection, importedItem);
      })
      .catch((error) => toast.error(formatIpcError(error) || 'Failed to import the collection'))
      .finally(() => {
        isImportingRef.current = false;
      });
  };

  return (
    <ImportHandoffContext.Provider value={importFrom}>
      {children}
      {importData?.type === 'multiple' ? (
        <BulkImportCollectionLocation importData={importData} onClose={closeImport} handleSubmit={importToLocation} />
      ) : null}
      {importData && importData.type !== 'multiple' ? (
        <ImportCollectionLocation
          rawData={importData.rawData}
          format={importData.type}
          sourceUrl={importData.sourceUrl}
          filePath={importData.filePath}
          rawContent={importData.rawContent}
          onClose={closeImport}
          handleSubmit={importToLocation}
        />
      ) : null}
      {postmanPackagePrompt ? (
        <PostmanPackageReport
          key={postmanPackagePrompt.collectionPath}
          report={postmanPackagePrompt.report}
          collectionPath={postmanPackagePrompt.collectionPath}
          onClose={clearPostmanPackagePrompt}
        />
      ) : null}
    </ImportHandoffContext.Provider>
  );
};

export default ImportHandoff;
