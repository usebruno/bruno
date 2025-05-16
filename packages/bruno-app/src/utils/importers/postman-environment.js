import fileDialog from 'file-dialog';
import { BrunoError } from 'utils/common/error';
import { postmanToBrunoEnvironment } from '@usebruno/converters';

const readFile = (files) => {
  return new Promise((resolve, reject) => {
    const fileReader = new FileReader();
    fileReader.onload = (e) => {
      try {
        let parsedPostmanEnvironment = JSON.parse(e.target.result);
        resolve(parsedPostmanEnvironment);
      } catch (err) {
        console.error(err);
        reject(new BrunoError('Unable to parse the postman environment json file'));
      }
    }
    fileReader.onerror = (err) => reject(err);
    fileReader.readAsText(files[0]);
  });
};

const importEnvironment = () => {
  return new Promise((resolve, reject) => {
    fileDialog({ multiple: true, accept: 'application/json' })
      .then((files) => {
        return Promise.all(
          Object.values(files ?? {}).map((file) =>
            readFile([file])
              .then((environment) => postmanToBrunoEnvironment(environment))
              .catch((err) => {
                console.error(`Error processing file: ${file.name || 'undefined'}`, err);
                throw err;
              })
          )
        );
      })
      .then((environments) => resolve(environments))
      .catch((err) => {
        console.log(err);
        reject(new BrunoError('Import Environment failed'));
      });
  });
};

export default importEnvironment;
