import each from 'lodash/each';
import get from 'lodash/get';
import fileDialog from 'file-dialog';
import { uuid } from 'utils/common';
import { BrunoError } from 'utils/common/error';
import { validateSchema, transformItemsInCollection, hydrateSeqInCollection } from './common';

const readFile = (files) => {
  return new Promise((resolve, reject) => {
    const fileReader = new FileReader();
    fileReader.onload = (e) => resolve(e.target.result);
    fileReader.onerror = (err) => reject(err);
    fileReader.readAsText(files[0]);
  });
};

const isItemAFolder = (item) => {
  return !item.request;
};

const importPostmanV2CollectionItem = (brunoParent, item) => {
  brunoParent.items = brunoParent.items || [];

  each(item, (i) => {
    if (isItemAFolder(i)) {
      const brunoFolderItem = {
        uid: uuid(),
        name: i.name,
        type: 'folder',
        items: []
      };
      brunoParent.items.push(brunoFolderItem);
      if (i.item && i.item.length) {
        importPostmanV2CollectionItem(brunoFolderItem, i.item);
      }
    } else {
      if (i.request) {
        let url = '';
        if (typeof i.request.url === 'string') {
          url = i.request.url;
        } else {
          url = get(i, 'request.url.raw') || '';
        }

        const brunoRequestItem = {
          uid: uuid(),
          name: i.name,
          type: 'http-request',
          request: {
            url: url,
            method: i.request.method,
            headers: [],
            params: [],
            body: {
              mode: 'none',
              json: null,
              text: null,
              xml: null,
              formUrlEncoded: [],
              multipartForm: []
            }
          }
        };

        const bodyMode = get(i, 'request.body.mode');
        if (bodyMode) {
          if (bodyMode === 'formdata') {
            brunoRequestItem.request.body.mode = 'multipartForm';
            each(i.request.body.formdata, (param) => {
              brunoRequestItem.request.body.formUrlEncoded.push({
                uid: uuid(),
                name: param.key,
                value: param.value,
                description: param.description,
                enabled: !param.disabled
              });
            });
          }

          if (bodyMode === 'urlencoded') {
            brunoRequestItem.request.body.mode = 'formUrlEncoded';
            each(i.request.body.urlencoded, (param) => {
              brunoRequestItem.request.body.formUrlEncoded.push({
                uid: uuid(),
                name: param.key,
                value: param.value,
                description: param.description,
                enabled: !param.disabled
              });
            });
          }

          if (bodyMode === 'raw') {
            const language = get(i, 'request.body.options.raw.language');
            if (language === 'json') {
              brunoRequestItem.request.body.mode = 'json';
              brunoRequestItem.request.body.json = i.request.body.raw;
            } else if (language === 'xml') {
              brunoRequestItem.request.body.mode = 'xml';
              brunoRequestItem.request.body.xml = i.request.body.raw;
            } else {
              brunoRequestItem.request.body.mode = 'text';
              brunoRequestItem.request.body.text = i.request.body.raw;
            }
          }
        }

        each(i.request.header, (header) => {
          brunoRequestItem.request.headers.push({
            uid: uuid(),
            name: header.key,
            value: header.value,
            description: header.description,
            enabled: !header.disabled
          });
        });

        each(get(i, 'request.url.query'), (param) => {
          brunoRequestItem.request.params.push({
            uid: uuid(),
            name: param.key,
            value: param.value,
            description: param.description,
            enabled: !param.disabled
          });
        });

        brunoParent.items.push(brunoRequestItem);
      }
    }
  });
};

const importPostmanV2Collection = (collection) => {
  const brunoCollection = {
    name: collection.info.name,
    uid: uuid(),
    version: '1',
    items: [],
    environments: []
  };

  importPostmanV2CollectionItem(brunoCollection, collection.item);

  return brunoCollection;
};

const parsePostmanCollection = (str) => {
  return new Promise((resolve, reject) => {
    try {
      let collection = JSON.parse(str);
      let schema = get(collection, 'info.schema');

      let v2Schemas = [
        'https://schema.getpostman.com/json/collection/v2.0.0/collection.json',
        'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      ];

      if (v2Schemas.includes(schema)) {
        return resolve(importPostmanV2Collection(collection));
      }

      throw new BrunoError('Unknown postman schema');
    } catch (err) {
      console.log(err);
      if (err instanceof BrunoError) {
        return reject(err);
      }

      return reject(new BrunoError('Unable to parse the postman collection json file'));
    }
  });
};

const importCollection = () => {
  return new Promise((resolve, reject) => {
    fileDialog({ accept: 'application/json' })
      .then(readFile)
      .then(parsePostmanCollection)
      .then(transformItemsInCollection)
      .then(hydrateSeqInCollection)
      .then(validateSchema)
      .then((collection) => resolve(collection))
      .catch((err) => {
        console.log(err);
        reject(new BrunoError('Import collection failed'));
      });
  });
};

export default importCollection;
