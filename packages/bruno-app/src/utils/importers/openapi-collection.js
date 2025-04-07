import jsyaml from 'js-yaml';
import fileDialog from 'file-dialog';
import { BrunoError } from 'utils/common/error';
import brunoConverters from '@usebruno/converters';
const { openApiToBruno } = brunoConverters;

const readFile = (files) => {
  return new Promise((resolve, reject) => {
    const fileReader = new FileReader();
    fileReader.onload = (e) => {
      try {
        // try to load JSON
        const parsedData = JSON.parse(e.target.result);
        resolve(parsedData);
      } catch (jsonError) {
        // not a valid JSOn, try yaml
        try {
          const parsedData = jsyaml.load(e.target.result);
          resolve(parsedData);
        } catch (yamlError) {
          console.error('Error parsing the file :', jsonError, yamlError);
          reject(new BrunoError('Import collection failed'));
        }
      }
    };
    fileReader.onerror = (err) => reject(err);
    fileReader.readAsText(files[0]);
  });
};

const importCollection = () => {
  return new Promise((resolve, reject) => {
    fileDialog({ accept: '.json, .yaml, .yml, application/json, application/yaml, application/x-yaml' })
      .then(readFile)
      .then((collection) => openApiToBruno(collection))
      .then((collection) => resolve({ collection }))
      .catch((err) => {
        console.error(err);
        reject(new BrunoError('Import collection failed: ' + err.message));
      });
  });
};

export default importCollection;
