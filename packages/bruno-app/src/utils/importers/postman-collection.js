import fileDialog from 'file-dialog';
import { BrunoError } from 'utils/common/error';
import { safeParseJSON } from 'utils/common/index';

const readFile = (files) => {
  return new Promise((resolve, reject) => {
    const fileReader = new FileReader();
    fileReader.onload = (e) => resolve(safeParseJSON(e.target.result));
    fileReader.onerror = (err) => reject(err);
    fileReader.readAsText(files[0]);
  });
};

const postmanToBruno = (collection) => {
  return new Promise((resolve, reject) => {
    window.ipcRenderer.invoke('renderer:convert-postman-to-bruno', collection)
      .then(result => resolve(result))
      .catch(err => {
        console.error('Error converting Postman to Bruno via Electron:', err);
        reject(new BrunoError('Conversion failed'));
      });
  });
};

const isPostmanCollection = (data) => {
  const info = data.info;
  if (!info || typeof info !== 'object') {
    return false;
  }

  const schema = info.schema;
  if (typeof schema !== 'string') {
    return false;
  }

  // Only accept supported Postman v2.0 and v2.1 schemas
  const supportedSchemas = [
    'https://schema.getpostman.com/json/collection/v2.0.0/collection.json',
    'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    'https://schema.postman.com/json/collection/v2.0.0/collection.json',
    'https://schema.postman.com/json/collection/v2.1.0/collection.json'
  ];

  return supportedSchemas.includes(schema);
};

export { postmanToBruno, readFile, isPostmanCollection };
