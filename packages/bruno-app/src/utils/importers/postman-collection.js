import get from 'lodash/get';
import { uuid } from 'utils/common';
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

export { postmanToBruno, readFile };
