
import each from 'lodash/each';
import get from 'lodash/get';

import cloneDeep from 'lodash/cloneDeep';
import { uuid } from 'utils/common';
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
  updateEnvUids(collection.environments);

  return collection;
};
