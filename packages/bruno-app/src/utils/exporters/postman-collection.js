import map from 'lodash/map';
import * as FileSaver from 'file-saver';
import { deleteSecretsInEnvs, deleteUidsInEnvs, deleteUidsInItems } from '../collections/export';

/**
 * Transforms a given URL string into an object representing the protocol, host, path, query, and variables.
 *
 * @param {string} url - The raw URL to be transformed.
 * @param {Object} params - The params object.
 * @returns {Object|null} An object containing the URL's protocol, host, path, query, and variables, or {} if an error occurs.
 */
export const transformUrl = (url, params) => {
  if (typeof url !== 'string' || !url.trim()) {
    throw new Error("Invalid URL input");
  }

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
    postmanUrl.host = host ? host.split(urlRegexPatterns.domainSegmentSeparator) : [];
    postmanUrl.path = path ? path.split(urlRegexPatterns.pathSegmentSeparator) : [];
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

/**
 * Collapses multiple consecutive slashes (`//`) into a single slash, while skipping the protocol (e.g., `http://` or `https://`).
 * 
 * @param {String} url - A URL string
 * @returns {String} The sanitized URL
 * 
 */
const collapseDuplicateSlashes = (url) => {
  return url.replace(/(?<!:)\/{2,}/g, '/');
};

/**
 * Replaces all `\\` (backslashes) with `//` (forward slashes) and collapses multiple slashes into one.
 * 
 * @param {string} url - The URL to sanitize.
 * @returns {string} The sanitized URL.
 *
 */
export const sanitizeUrl = (url) => {
  let sanitizedUrl = collapseDuplicateSlashes(url.replace(/\\/g, '//'));
  return sanitizedUrl;
};

export const exportCollection = (collection) => {
  delete collection.uid;
  delete collection.processEnvVariables;
  deleteUidsInItems(collection.items);
  deleteUidsInEnvs(collection.environments);
  deleteSecretsInEnvs(collection.environments);

  const generateInfoSection = () => {
    return {
      name: collection.name,
      description: collection.root?.docs,
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
    };
  };

  const generateCollectionVars = (collection) => {
    const pattern = /{{[^{}]+}}/g;
    let listOfVars = [];

    const findOccurrences = (obj, results) => {
      if (typeof obj === 'object') {
        if (Array.isArray(obj)) {
          obj.forEach((item) => findOccurrences(item, results));
        } else {
          for (const key in obj) {
            findOccurrences(obj[key], results);
          }
        }
      } else if (typeof obj === 'string') {
        obj.replace(pattern, (match) => {
          results.push(match.replace(/{{|}}/g, ''));
        });
      }
    };

    findOccurrences(collection, listOfVars);

    const finalArrayOfVars = [...new Set(listOfVars)];

    return finalArrayOfVars.map((variable) => ({
      key: variable,
      value: '',
      type: 'default'
    }));
  };

  const generateEventSection = (item) => {
    const eventArray = [];
    if (item?.request?.tests?.length) {
      eventArray.push({
        listen: 'test',
        script: {
          exec: item.request.tests.split('\n')
          // type: 'text/javascript'
        }
      });
    }
    if (item?.request?.script?.req) {
      eventArray.push({
        listen: 'prerequest',
        script: {
          exec: item.request.script.req.split('\n')
          // type: 'text/javascript'
        }
      });
    }
    return eventArray;
  };

  const generateHeaders = (headersArray) => {
    return map(headersArray, (item) => {
      return {
        key: item.name,
        value: item.value,
        disabled: !item.enabled,
        type: 'default'
      };
    });
  };

  const generateBody = (body) => {
    switch (body.mode) {
      case 'formUrlEncoded':
        return {
          mode: 'urlencoded',
          urlencoded: map(body.formUrlEncoded, (bodyItem) => {
            return {
              key: bodyItem.name,
              value: bodyItem.value,
              disabled: !bodyItem.enabled,
              type: 'default'
            };
          })
        };
      case 'multipartForm':
        return {
          mode: 'formdata',
          formdata: map(body.multipartForm, (bodyItem) => {
            return {
              key: bodyItem.name,
              value: bodyItem.value,
              disabled: !bodyItem.enabled,
              type: 'default'
            };
          })
        };
      case 'json':
        return {
          mode: 'raw',
          raw: body.json,
          options: {
            raw: {
              language: 'json'
            }
          }
        };
      case 'xml':
        return {
          mode: 'raw',
          raw: body.xml,
          options: {
            raw: {
              language: 'xml'
            }
          }
        };
      case 'text':
        return {
          mode: 'raw',
          raw: body.text,
          options: {
            raw: {
              language: 'text'
            }
          }
        };
      case 'graphql':
        return {
          mode: 'graphql',
          graphql: body.graphql
        };
    }
  };

  const generateAuth = (itemAuth) => {
    switch (itemAuth?.mode) {
      case 'bearer':
        return {
          type: 'bearer',
          bearer: {
            key: 'token',
            value: itemAuth.bearer.token,
            type: 'string'
          }
        };
      case 'basic': {
        return {
          type: 'basic',
          basic: [
            {
              key: 'password',
              value: itemAuth.basic.password,
              type: 'string'
            },
            {
              key: 'username',
              value: itemAuth.basic.username,
              type: 'string'
            }
          ]
        };
      }
      case 'apikey': {
        return {
          type: 'apikey',
          apikey: [
            {
              key: 'key',
              value: itemAuth.apikey.key,
              type: 'string'
            },
            {
              key: 'value',
              value: itemAuth.apikey.value,
              type: 'string'
            }
          ]
        };
      }
      default: {
        return {
          type: 'noauth'
        };
      }
    }
  };

  const generateRequestSection = (itemRequest) => {
    const requestObject = {
      method: itemRequest.method,
      header: generateHeaders(itemRequest.headers),
      auth: generateAuth(itemRequest.auth),
      description: itemRequest.docs,
      // We sanitize the URL to make sure it's in the right format before passing it to the transformUrl func. This means changing backslashes to forward slashes and reducing multiple slashes to a single one, except in the protocol part.
      url: transformUrl(sanitizeUrl(itemRequest.url), itemRequest.params)
    };

    if (itemRequest.body.mode !== 'none') {
      requestObject.body = generateBody(itemRequest.body);
    }
    return requestObject;
  };

  const generateItemSection = (itemsArray) => {
    return map(itemsArray, (item) => {
      if (item.type === 'folder') {
        return {
          name: item.name,
          item: item.items.length ? generateItemSection(item.items) : []
        };
      } else {
        return {
          name: item.name,
          event: generateEventSection(item),
          request: generateRequestSection(item.request)
        };
      }
    });
  };
  const collectionToExport = {};
  collectionToExport.info = generateInfoSection();
  collectionToExport.item = generateItemSection(collection.items);
  collectionToExport.variable = generateCollectionVars(collection);

  const fileName = `${collection.name}.json`;
  const fileBlob = new Blob([JSON.stringify(collectionToExport, null, 2)], { type: 'application/json' });

  FileSaver.saveAs(fileBlob, fileName);
};

export default exportCollection;
