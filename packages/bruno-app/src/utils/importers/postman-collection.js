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
  // Accept schemas hosted at schema.getpostman.com or schema.postman.com
  const schemaRegex = /^https:\/\/schema\.(?:getpostman|postman)\.com\//;
  if (typeof schema === 'string' && schemaRegex.test(schema)) {
    return true;
  }

  return false;
};

export { postmanToBruno, readFile, isPostmanCollection };
