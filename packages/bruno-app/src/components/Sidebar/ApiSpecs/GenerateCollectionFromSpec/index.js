import { useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import ImportCollectionLocation from 'components/Sidebar/ImportCollectionLocation';
import { importCollection } from 'providers/ReduxStore/slices/collections/actions';
import { toastError } from 'utils/common/error';

// renderer:import-collection resolves even when it imported nothing, so a failure
// arrives here as an undefined item rather than a rejection.
const reportFailedImport = async (collectionLocation) => {
  const locationExists = await window.ipcRenderer.invoke('renderer:is-directory', collectionLocation);
  toast.error(
    locationExists
      ? 'Failed to generate collection'
      : `Failed to generate collection: ${collectionLocation} is not an existing folder`
  );
};

const GenerateCollectionFromSpec = ({ apiSpec, onClose }) => {
  const dispatch = useDispatch();

  const handleSubmit = (convertedCollection, collectionLocation, options = {}) => {
    dispatch(importCollection(convertedCollection, collectionLocation, options))
      .then((importedItem) => {
        if (!importedItem) {
          return reportFailedImport(collectionLocation);
        }
        onClose();
      })
      .catch((error) => toastError(error, 'Failed to generate collection'));
  };

  return (
    <ImportCollectionLocation
      rawData={apiSpec.resolvedJson || apiSpec.json}
      format="openapi"
      filePath={apiSpec.pathname}
      rawContent={apiSpec.raw}
      onClose={onClose}
      handleSubmit={handleSubmit}
    />
  );
};

export default GenerateCollectionFromSpec;
