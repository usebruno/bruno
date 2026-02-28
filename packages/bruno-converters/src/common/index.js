import each from 'lodash/each';
import get from 'lodash/get';
import { customAlphabet } from 'nanoid';
import cloneDeep from 'lodash/cloneDeep';
import { collectionSchema } from '@usebruno/schema';

export const safeParseJSON = (str) => {
  if (!str || !str.length || typeof str !== 'string') {
    return str;
  }
  try {
    return JSON.parse(str);
  } catch (e) {
    return str;
  }
};

export const safeStringifyJSON = (obj, indent = false) => {
  if (obj === undefined) {
    return obj;
  }
  try {
    if (indent) {
      return JSON.stringify(obj, null, 2);
    }
    return JSON.stringify(obj);
  } catch (e) {
    return obj;
  }
};

export const isItemARequest = (item) => {
  return item.hasOwnProperty('request') && ['http-request', 'graphql-request'].includes(item.type) && !item.items;
};

// a customized version of nanoid without using _ and -
export const uuid = () => {
  // https://github.com/ai/nanoid/blob/main/url-alphabet/index.js
  const urlAlphabet = 'useandom26T198340PX75pxJACKVERYMINDBUSHWOLFGQZbfghjklqvwyzrict';
  const customNanoId = customAlphabet(urlAlphabet, 21);

  return customNanoId();
};

/**
 * Sanitizes a tag name for BRU format compatibility.
 * BRU format only supports tag names containing alphanumeric characters,
 * hyphens (-), and underscores (_). Spaces are replaced with underscores.
 *
 * @param {string} tag - The tag to sanitize
 * @param {Object} options - Sanitization options
 * @param {string} options.collectionFormat - The collection format ('yml' for OpenCollection YAML)
 * @returns {string|null} - The sanitized tag, or null if the result is empty
 */
export const sanitizeTag = (tag, options = {}) => {
  const typeofTag = typeof tag;
  if (!tag || !['string', 'object'].includes(typeofTag)) {
    return null;
  }

  let usableTagString = typeof tag == 'string' ? tag : 'name' in tag ? tag.name : '';

  let sanitized = usableTagString.trim();

  // BRU format only supports alphanumeric, hyphens, and underscores in tags
  // The BRU grammar defines listitem as: (alnum | "_" | "-")+
  // Spaces are NOT allowed, so we replace them with underscores

  // Replace spaces with underscores first
  sanitized = sanitized.replace(/\s+/g, '_');

  // Replace any character that's NOT alphanumeric, hyphen, or underscore with underscore
  sanitized = sanitized.replace(/[^\p{L}\p{N}\-_]/gu, '_');

  // Collapse multiple consecutive underscores into one
  sanitized = sanitized.replace(/_+/g, '_');

  // Remove leading characters that aren't alphanumeric
  sanitized = sanitized.replace(/^[^\p{L}\p{N}]+/gu, '');

  // Remove trailing characters that aren't alphanumeric
  sanitized = sanitized.replace(/[^\p{L}\p{N}]+$/gu, '');

  // Return null if the result is empty
  return sanitized || null;
};

/**
 * Sanitizes an array of tags, removing duplicates and null values.
 *
 * @param {string[]} tags - Array of tags to sanitize
 * @param {Object} options - Sanitization options
 * @returns {string[]} - Array of unique sanitized tags
 */
export const sanitizeTags = (tags, options = {}) => {
  if (!Array.isArray(tags)) {
    return [];
  }

  return [...new Set(
    tags
      .map((tag) => sanitizeTag(tag, options))
      .filter((tag) => tag !== null)
  )];
};

export const validateSchema = (collection = {}) => {
  try {
    collectionSchema.validateSync(collection);
    return collection;
  } catch (err) {
    console.log('Error validating schema', err);
    throw new Error('The Collection has an invalid schema');
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

export const deleteUidsInItems = (items) => {
  each(items, (item) => {
    delete item.uid;

    if (['http-request', 'graphql-request', 'grpc-request'].includes(item.type)) {
      each(get(item, 'request.headers'), (header) => delete header.uid);
      each(get(item, 'request.params'), (param) => delete param.uid);
      each(get(item, 'request.vars.req'), (v) => delete v.uid);
      each(get(item, 'request.vars.res'), (v) => delete v.uid);
      each(get(item, 'request.vars.assertions'), (a) => delete a.uid);
      each(get(item, 'request.body.multipartForm'), (param) => delete param.uid);
      each(get(item, 'request.body.formUrlEncoded'), (param) => delete param.uid);
      each(get(item, 'request.body.file'), (param) => delete param.uid);
    }

    if (item.items && item.items.length) {
      deleteUidsInItems(item.items);
    }
  });
};

/**
 * Some of the models in the app are not consistent with the Collection Json format
 * This function is used to transform the models to the Collection Json format
 */
export const transformItem = (items = []) => {
  each(items, (item) => {
    if (['http-request', 'graphql-request'].includes(item.type)) {
      if (item.type === 'graphql-request') {
        item.type = 'graphql';
      }

      if (item.type === 'http-request') {
        item.type = 'http';
      }
    }

    if (item.items && item.items.length) {
      transformItem(item.items);
    }
  });
};

export const deleteUidsInEnvs = (envs) => {
  each(envs, (env) => {
    delete env.uid;
    each(env.variables, (variable) => delete variable.uid);
  });
};

export const deleteSecretsInEnvs = (envs) => {
  each(envs, (env) => {
    each(env.variables, (variable) => {
      if (variable.secret) {
        variable.value = '';
      }
    });
  });
};
