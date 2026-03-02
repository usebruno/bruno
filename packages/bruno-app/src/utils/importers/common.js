import jsyaml from 'js-yaml';
import each from 'lodash/each';
import get from 'lodash/get';
import filter from 'lodash/filter';

import cloneDeep from 'lodash/cloneDeep';
import { uuid } from 'utils/common';
import { isItemARequest } from 'utils/collections';
import { collectionSchema } from '@usebruno/schema';
import { BrunoError } from 'utils/common/error';
import { isOpenApiSpec } from './openapi-collection';
import { isPostmanCollection } from './postman-collection';
import { isInsomniaCollection } from './insomnia-collection';

export const validateSchema = async (collections = []) => {
  collections = Array.isArray(collections) ? collections : [collections];

  try {
    await Promise.all(
      collections.map(async (collection) => {
        await collectionSchema.validate(collection);
      })
    );
    return collections;
  } catch (err) {
    console.log(err);
    throw new BrunoError('The Collection file is corrupted');
  }
};

export const updateUidsInCollection = (_collection) => {
  const collection = cloneDeep(_collection);

  collection.uid = uuid();

  const updateItemUids = (items = []) => {
    each(items, (item) => {
      item.uid = uuid();

      each(get(item, 'request.headers'), (header) => (header.uid = uuid()));
      each(get(item, 'request.params'), (param) => (param.uid = uuid()));
      each(get(item, 'request.vars.req'), (v) => (v.uid = uuid()));
      each(get(item, 'request.vars.res'), (v) => (v.uid = uuid()));
      each(get(item, 'request.assertions'), (a) => (a.uid = uuid()));
      each(get(item, 'request.body.multipartForm'), (param) => (param.uid = uuid()));
      each(get(item, 'request.body.formUrlEncoded'), (param) => (param.uid = uuid()));
      each(get(item, 'request.body.file'), (param) => (param.uid = uuid()));

      each(get(item, 'examples'), (example) => {
        example.uid = uuid();
        example.itemUid = item.uid;
        each(get(example, 'request.headers'), (header) => (header.uid = uuid()));
        each(get(example, 'request.params'), (param) => (param.uid = uuid()));
        each(get(example, 'request.body.multipartForm'), (param) => (param.uid = uuid()));
        each(get(example, 'request.body.formUrlEncoded'), (param) => (param.uid = uuid()));
        each(get(example, 'request.body.file'), (param) => (param.uid = uuid()));
        each(get(example, 'response.headers'), (header) => (header.uid = uuid()));
      });

      if (item.items && item.items.length) {
        updateItemUids(item.items);
      }
    });
  };
  updateItemUids(collection.items);

  const updateEnvUids = (envs = []) => {
    each(envs, (env) => {
      env.uid = uuid();
      each(env.variables, (variable) => (variable.uid = uuid()));
    });
  };
  updateEnvUids(collection.environments);

  return collection;
};

export const filterItemsInCollection = (collection) => {
  // this filters out the bruno.json item in older collection exports
  collection.items = filter(collection.items, (item) => {
    if (item?.name === 'bruno' && item?.type === 'json') {
      return false;
    }
    return true;
  });

  return collection;
};

// todo
// need to eventually get rid of supporting old collection app models
// 1. start with making request type a constant fetched from a single place
// 2. move references of param and replace it with query inside the app
export const transformItemsInCollection = (collection) => {
  const transformItems = (items = []) => {
    each(items, (item) => {
      if (['http', 'graphql', 'grpc', 'ws'].includes(item.type)) {
        item.type = `${item.type}-request`;
        const isGrpcRequest = item.type === 'grpc-request';
        const isWSRequest = item.type === 'ws-request';

        if (item.request.query) {
          item.request.params = item.request.query.map((queryItem) => ({
            ...queryItem,
            type: 'query',
            uid: queryItem.uid || uuid()
          }));
        }

        if (isGrpcRequest) {
          delete item.request.params;
        }

        if (isWSRequest) {
          delete item.request.params;
          delete item.request.method;
        }

        delete item.request.query;

        // from 5 feb 2024, multipartFormData needs to have a type
        // this was introduced when we added support for file uploads
        // below logic is to make older collection exports backward compatible
        let multipartFormData = get(item, 'request.body.multipartForm');
        if (multipartFormData) {
          each(multipartFormData, (form) => {
            if (!form.type) {
              form.type = 'text';
            }
          });
        }

        // Transform examples as well
        each(get(item, 'examples'), (example) => {
          if (['http', 'graphql', 'grpc', 'ws'].includes(example.type)) {
            example.type = `${example.type}-request`;
            const isGrpcExample = example.type === 'grpc-request';
            const isWSExample = example.type === 'ws-request';

            if (example.request && example.request.query) {
              example.request.params = example.request.query.map((queryItem) => ({
                ...queryItem,
                type: 'query',
                uid: queryItem.uid || uuid()
              }));
            }

            if (isGrpcExample) {
              delete example.request.params;
            }

            if (isWSExample) {
              delete example.request.params;
              delete example.request.method;
            }

            if (example.request) {
              delete example.request.query;
            }

            // Handle multipartFormData for examples
            let exampleMultipartFormData = get(example, 'request.body.multipartForm');
            if (exampleMultipartFormData) {
              each(exampleMultipartFormData, (form) => {
                if (!form.type) {
                  form.type = 'text';
                }
              });
            }
          }
        });
      }

      if (item.items && item.items.length) {
        transformItems(item.items);
      }
    });
  };

  if (Array.isArray(collection)) {
    collection.forEach((col) => transformItems(col.items));
  } else {
    transformItems(collection.items);
  }

  return collection;
};

export const hydrateSeqInCollection = (collection) => {
  const hydrateSeq = (items = []) => {
    let index = 1;
    each(items, (item) => {
      if (isItemARequest(item) && !item.seq) {
        item.seq = index;
        index++;
      }
      if (item.items && item.items.length) {
        hydrateSeq(item.items);
      }
    });
  };

  if (Array.isArray(collection)) {
    collection.forEach((col) => hydrateSeq(col.items));
  } else {
    hydrateSeq(collection.items);
  }

  return collection;
};

/**
 * Gets the schema type(postman, insomnia, openapi) of the CollectionJSON data
 * @param {Object} data - The JSON data to get the type of
 * @returns {'openapi' | 'postman' | 'insomnia' | 'unknown'} - The type of the CollectionJSON data
 */
const getCollectionSpecType = (data) => {
  return isOpenApiSpec(data) ? 'openapi' : isPostmanCollection(data) ? 'postman' : isInsomniaCollection(data) ? 'insomnia' : 'unknown';
};

export const fetchAndValidateApiSpecFromUrl = ({ url }) => {
  const { ipcRenderer } = window;
  return new Promise((resolve, reject) => {
    ipcRenderer
      .invoke('renderer:fetch-api-spec', url)
      .then((res) => {
        const data = jsyaml.load(res);
        const specType = getCollectionSpecType(data);
        resolve({ data, specType, rawContent: res });
      })
      .catch((err) => {
        console.error(err);
        reject(new BrunoError('Failed to fetch API specification: ' + err.message));
      });
  });
};
