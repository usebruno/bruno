import * as FileSaver from 'file-saver';

const exportCollection = (collection) => {
  const fileName = `${collection.name}.json`;
  const fileBlob = new Blob([JSON.stringify(collection, null, 2)], { type: "application/json" })

  FileSaver.saveAs(fileBlob, fileName);
};

export default exportCollection;