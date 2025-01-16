import each from 'lodash/each';
import get from 'lodash/get';

import cloneDeep from 'lodash/cloneDeep';
import { uuid, normalizeFileName } from 'utils/common';
import { isItemARequest } from 'utils/collections';
import { collectionSchema } from '@usebruno/schema';
import { BrunoError } from 'utils/common/error';

export const validateSchema = (collection = {}) => {
  return new Promise((resolve, reject) => {
    collectionSchema
      .validate(collection)
      .then(() => resolve(collection))
      .catch((err) => {
        console.log(err);
        reject(new BrunoError('The Collection file is corrupted'));
      });
  });
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

// todo
// need to eventually get rid of supporting old collection app models
// 1. start with making request type a constant fetched from a single place
// 2. move references of param and replace it with query inside the app
export const transformItemsInCollection = (collection) => {
  const transformItems = (items = []) => {
    each(items, (item) => {
      item.name = normalizeFileName(item.name);

      if (['http', 'graphql'].includes(item.type)) {
        item.type = `${item.type}-request`;

        if (item.request.query) {
          item.request.params = item.request.query.map((queryItem) => ({
            ...queryItem,
            type: 'query',
            uid: queryItem.uid || uuid()
          }));
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
      }

      if (item.items && item.items.length) {
        transformItems(item.items);
      }
    });
  };

  transformItems(collection.items);

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
  hydrateSeq(collection.items);

  return collection;
};
