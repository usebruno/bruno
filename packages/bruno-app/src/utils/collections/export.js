import * as FileSaver from 'file-saver';
import get from 'lodash/get';
import each from 'lodash/each';

export const deleteUidsInItems = (items) => {
  each(items, (item) => {
    delete item.uid;

    if (['http-request', 'graphql-request'].includes(item.type)) {
      each(get(item, 'request.headers'), (header) => delete header.uid);
      each(get(item, 'request.params'), (param) => delete param.uid);
      each(get(item, 'request.vars.req'), (v) => delete v.uid);
      each(get(item, 'request.vars.res'), (v) => delete v.uid);
      each(get(item, 'request.vars.assertions'), (a) => delete a.uid);
      each(get(item, 'request.body.multipartForm'), (param) => delete param.uid);
      each(get(item, 'request.body.formUrlEncoded'), (param) => delete param.uid);
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

export const exportCollection = (collection) => {
  // delete uids
  delete collection.uid;

  // delete process variables
  delete collection.processEnvVariables;

  deleteUidsInItems(collection.items);
  deleteUidsInEnvs(collection.environments);
  deleteSecretsInEnvs(collection.environments);
  transformItem(collection.items);

  const fileName = `${collection.name}.json`;
  const fileBlob = new Blob([JSON.stringify(collection, null, 2)], { type: 'application/json' });

  FileSaver.saveAs(fileBlob, fileName);
};

/**
 * Transforms a given URL string into an object representing the protocol, host, path, query, and variables.
 *
 * @param {string} url - The raw URL to be transformed.
 * @param {Object} params - The params object.
 * @returns {Object} An object containing the URL's protocol, host, path, query, and variables.
 */
export const transformUrl = (url, params) => {
  const urlRegexPatterns = {
    protocolAndRestSeparator: /:\/\//,
    hostAndPathSeparator: /\/(.+)/,
    domainSegmentSeparator: /\./,
    pathSegmentSeparator: /\//,
    queryStringSeparator: /\?/
  };

  const postmanUrl = { raw: url };

  /**
   * Splits a URL into its protocol, host and path.
   *
   * @param {string} url - The URL to be split.
   * @returns {Object} An object containing the protocol and the raw host/path string.
   */
  const splitUrl = (url) => {
    const urlParts = url.split(urlRegexPatterns.protocolAndRestSeparator);
    if (urlParts.length === 1) {
      return { protocol: '', rawHostAndPath: urlParts[0] };
    } else if (urlParts.length === 2) {
      const [hostAndPath, _] = urlParts[1].split(urlRegexPatterns.queryStringSeparator);
      return { protocol: urlParts[0], rawHostAndPath: hostAndPath };
    } else {
      throw new Error(`Invalid URL format: ${url}`);
    }
  };

  /**
   * Splits the host and path from a raw host/path string.
   *
   * @param {string} rawHostAndPath - The raw host and path string to be split.
   * @returns {Object} An object containing the host and path.
   */
  const splitHostAndPath = (rawHostAndPath) => {
    const [host, path = ''] = rawHostAndPath.split(urlRegexPatterns.hostAndPathSeparator);
    return { host, path };
  };

  try {
    const { protocol, rawHostAndPath } = splitUrl(url);
    postmanUrl.protocol = protocol;

    const { host, path } = splitHostAndPath(rawHostAndPath);
    postmanUrl.host = host.split(urlRegexPatterns.domainSegmentSeparator);
    postmanUrl.path = path ? path.split(urlRegexPatterns.pathSegmentSeparator).filter(Boolean) : [];
  } catch (error) {
    console.error(error.message);
    return {};
  }

  // Construct query params.
  postmanUrl.query = params
    .filter((param) => param.type === 'query')
    .map(({ name, value, description }) => ({ key: name, value, description }));
  
  // Construct path params.
  postmanUrl.variable = params
    .filter((param) => param.type === 'path')
    .map(({ name, value, description }) => ({ key: name, value, description }));

  return postmanUrl;
};

export default exportCollection;
