import * as FileSaver from 'file-saver';
import { brunoToPostman } from '@usebruno/converters';
import { filterTransientItems } from 'utils/collections';

export const exportCollection = (collection) => {
  // Filter out transient items before export
  collection.items = filterTransientItems(collection.items);

  const collectionToExport = brunoToPostman(collection);

  const fileName = `${collection.name}.json`;
  const fileBlob = new Blob([JSON.stringify(collectionToExport, null, 2)], { type: 'application/json' });

  FileSaver.saveAs(fileBlob, fileName);
};

export default exportCollection;
