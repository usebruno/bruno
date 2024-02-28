import jsyaml from 'js-yaml';
import each from 'lodash/each';
import get from 'lodash/get';
import fileDialog from 'file-dialog';
import { uuid } from 'utils/common';
import { BrunoError } from 'utils/common/error';
import { validateSchema, transformItemsInCollection, hydrateSeqInCollection } from './common';
import { readFile, parseOpenApiCollection } from 'utils/importers/openapi-collection';

const importCollections = async () => {
  const collections = [];

  return new Promise((resolve, reject) => {
    fileDialog({ multiple: true })
      .then((files) => {
        // iterate over each file and import it
        each(files, async (file) => {
          readFile([file])
            .then(parseOpenApiCollection)
            .then(transformItemsInCollection)
            .then(hydrateSeqInCollection)
            .then(validateSchema)
            .then((collection) => {
              collections.push(collection);
            });
        });
      })
      .then(() => {
        resolve(collections);
      })
      .catch((err) => {
        reject(new BrunoError('Import collection failed'));
      });
  });
};

export default importCollections;
