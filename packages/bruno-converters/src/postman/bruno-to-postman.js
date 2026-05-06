import map from 'lodash/map';
import { deleteSecretsInEnvs, deleteUidsInEnvs, deleteUidsInItems, isItemARequest } from '../common';
import translateBruToPostman from '../utils/bruno-to-postman-translator';

const isItemAFolder = (item) => item.type === 'folder';

const sortItemsBySequence = (items) => [...items].sort((a, b) => a.seq - b.seq);

const sortByNameThenSequence = (items) => {
  const isSeqValid = (seq) => Number.isFinite(seq) && Number.isInteger(seq) && seq > 0;

  const alphabeticallySorted = [...items].sort((a, b) => a.name && b.name && a.name.localeCompare(b.name));

  const withoutSeq = alphabeticallySorted.filter((f) => !isSeqValid(f['seq']));
  const withSeq = alphabeticallySorted.filter((f) => isSeqValid(f['seq'])).sort((a, b) => a.seq - b.seq);

  const sortedItems = withoutSeq;

  withSeq.forEach((item) => {
    const position = item.seq - 1;
    const existingItem = withoutSeq[position];

    const hasItemWithSameSeq = Array.isArray(existingItem)
      ? existingItem?.[0]?.seq === item.seq
      : existingItem?.seq === item.seq;

    if (hasItemWithSameSeq) {
      const newGroup = Array.isArray(existingItem) ? [...existingItem, item] : [existingItem, item];
      withoutSeq.splice(position, 1, newGroup);
    } else {
      withoutSeq.splice(position, 0, item);
    }
  });

  return sortedItems.flat();
};

const sortItemsForExport = (items) => {
  if (!items || !Array.isArray(items)) return [];

  const folders = items.filter((item) => item && isItemAFolder(item));
  const requests = items.filter((item) => item && isItemARequest(item));

  const sortedFolders = sortByNameThenSequence(folders);
  const sortedRequests = sortItemsBySequence(requests);

  return [...sortedFolders, ...sortedRequests];
};

/**
 * Transforms a given URL string into an object representing the protocol, host, path, query, and variables.
 *
 * @param {string} url - The raw URL to be transformed.
 * @param {Object} params - The params object.
 * @returns {Object|null} An object containing the URL's protocol, host, path, query, and variables, or {} if an error occurs.
 */
export const transformUrl = (url, params) => {
  if (typeof url !== 'string' || !url.trim()) {
    url = '';
    console.error('Invalid URL input:', url);
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

export const brunoToPostman = (collection, version = '2.1') => {
  delete collection.uid;
  delete collection.processEnvVariables;
  deleteUidsInItems(collection.items);
  deleteUidsInEnvs(collection.environments);
  deleteSecretsInEnvs(collection.environments);

  const schemaMap = {
    '2.0': 'https://schema.getpostman.com/json/collection/v2.0.0/collection.json',
    '2.1': 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
  };

  const generateInfoSection = () => {
    return {
      name: collection.name,
      description: collection.root?.docs,
      schema: schemaMap[version] || schemaMap['2.1']
    };
  };

  const generateCollectionVars = (collection) => {
    const pattern = /{{[^{}]+}}/g;
    let collectionVars = [];

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
          const varKey = match.replace(/{{|}}/g, '');
          results.push({
            key: varKey,
            value: '',
            type: 'default'
          });
        });
      }
    };

    findOccurrences(collection, collectionVars);

    // Add request and response vars
    let reqVars = (collection.root?.request?.vars?.req || []).map((v) => ({
      key: v.name,
      value: v.value,
      type: 'default'
    }));

    let resVars = (collection.root?.request?.vars?.res || []).map((v) => ({
      key: v.name,
      value: v.value,
      type: 'default'
    }));

    // Merge and deduplicate final result
    const allVars = [...reqVars, ...resVars, ...collectionVars];
    const finalVarsMap = new Map();
    allVars.forEach((v) => {
      if (!finalVarsMap.has(v.key)) {
        finalVarsMap.set(v.key, v);
      }
    });

    return Array.from(finalVarsMap.values());
  };
  const translateScriptSafely = (script = '') => {
    try {
      return translateBruToPostman(script);
    } catch (err) {
      console.warn('Bru→Postman script translation failed, leaving script as-is', err);
      return script;
    }
  };

  const generateEventSection = (item) => {
    const eventArray = [];
    // Request: item.script, Folder: item.root.request.script, Collection: item.request.script
    // Tests: item.tests, Folder: item.root.request.tests, Collection: item.request.tests
    const scriptBlock = item?.script || item?.root?.request?.script || item?.request?.script || {};
    const testsBlock = item?.tests || item?.root?.request?.tests || item?.request?.tests;

    if (scriptBlock.req && typeof scriptBlock.req === 'string') {
      const translated = translateScriptSafely(scriptBlock.req);
      eventArray.push({
        listen: 'prerequest',
        script: {
          type: 'text/javascript',
          packages: {},
          requests: {},
          exec: translated.split('\n')
        }
      });
    }
    // testsBlock is added in the post response script since postman only supports tests in the post response script
    if (scriptBlock.res || testsBlock) {
      const exec = [];
      if (scriptBlock.res && typeof scriptBlock.res === 'string') {
        const translated = translateScriptSafely(scriptBlock.res);
        exec.push(...translated.split('\n'));
      }
      if (testsBlock && typeof testsBlock === 'string') {
        const translatedTests = translateScriptSafely(testsBlock);
        if (exec.length > 0) {
          exec.push('');
        }
        exec.push('// Tests');
        exec.push(...translatedTests.split('\n'));
      }

      // Only push the event if exec has content
      if (exec.length > 0) {
        eventArray.push({
          listen: 'test',
          script: {
            type: 'text/javascript',
            packages: {},
            requests: {},
            exec: exec
          }
        });
      }
    }
    return eventArray;
  };

  const generateHeaders = (headersArray) => {
    if (!headersArray || !Array.isArray(headersArray)) {
      return [];
    }
    return map(headersArray, (item) => {
      return {
        key: item.name || '',
        value: item.value || '',
        disabled: !item.enabled,
        type: 'default'
      };
    });
  };

  const generateBody = (body) => {
    if (!body || !body.mode) {
      return {
        mode: 'raw',
        raw: ''
      };
    }

    switch (body.mode) {
      case 'formUrlEncoded':
        return {
          mode: 'urlencoded',
          urlencoded: map(body.formUrlEncoded || [], (bodyItem) => {
            return {
              key: bodyItem.name || '',
              value: bodyItem.value || '',
              disabled: !bodyItem.enabled,
              type: 'default'
            };
          })
        };
      case 'multipartForm':
        return {
          mode: 'formdata',
          formdata: map(body.multipartForm || [], (bodyItem) => {
            const isFile = bodyItem.type === 'file';

            const getSrc = () => {
              if (!bodyItem.value) return null;
              if (Array.isArray(bodyItem.value)) {
                if (bodyItem.value.length === 0) return null;
                if (bodyItem.value.length === 1) return bodyItem.value[0];
                return bodyItem.value;
              }
              return bodyItem.value;
            };
            return {
              key: bodyItem.name || '',
              disabled: !bodyItem.enabled,
              type: isFile ? 'file' : 'text',
              ...(isFile ? { src: getSrc() } : { value: bodyItem.value || '' }),
              ...(bodyItem.contentType && { contentType: bodyItem.contentType })
            };
          })
        };
      case 'json':
        return {
          mode: 'raw',
          raw: body.json || '',
          options: {
            raw: {
              language: 'json'
            }
          }
        };
      case 'xml':
        return {
          mode: 'raw',
          raw: body.xml || '',
          options: {
            raw: {
              language: 'xml'
            }
          }
        };
      case 'text':
        return {
          mode: 'raw',
          raw: body.text || '',
          options: {
            raw: {
              language: 'text'
            }
          }
        };
      case 'graphql':
        return {
          mode: 'graphql',
          graphql: body.graphql || {}
        };
      default:
        return {
          mode: 'raw',
          raw: ''
        };
    }
  };

  const generateAuth = (itemAuth) => {
    switch (itemAuth?.mode) {
      case 'bearer': {
        const token = itemAuth.bearer?.token || '';
        if (version === '2.0') {
          return {
            type: 'bearer',
            bearer: {
              token: token
            }
          };
        }
        return {
          type: 'bearer',
          bearer: [
            {
              key: 'token',
              value: token,
              type: 'string'
            }
          ]
        };
      }
      case 'basic': {
        const username = itemAuth.basic?.username || '';
        const password = itemAuth.basic?.password || '';
        if (version === '2.0') {
          return {
            type: 'basic',
            basic: {
              username: username,
              password: password
            }
          };
        }
        return {
          type: 'basic',
          basic: [
            {
              key: 'username',
              value: username,
              type: 'string'
            },
            {
              key: 'password',
              value: password,
              type: 'string'
            }
          ]
        };
      }
      case 'apikey': {
        const key = itemAuth.apikey?.key || '';
        const value = itemAuth.apikey?.value || '';
        const inValue = itemAuth.apikey?.in || 'header';
        if (version === '2.0') {
          return {
            type: 'apikey',
            apikey: {
              key: key,
              value: value,
              in: inValue
            }
          };
        }
        return {
          type: 'apikey',
          apikey: [
            {
              key: 'key',
              value: key,
              type: 'string'
            },
            {
              key: 'value',
              value: value,
              type: 'string'
            },
            {
              key: 'in',
              value: inValue,
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
    if (!itemRequest) {
      return {};
    }

    const requestObject = {
      method: itemRequest.method || 'GET',
      header: generateHeaders(itemRequest.headers),
      auth: generateAuth(itemRequest.auth),
      description: itemRequest.docs || '',
      // We sanitize the URL to make sure it's in the right format before passing it to the transformUrl func. This means changing backslashes to forward slashes and reducing multiple slashes to a single one, except in the protocol part.
      url: transformUrl(sanitizeUrl(itemRequest.url || ''), itemRequest.params || [])
    };

    if (itemRequest.body && itemRequest.body.mode !== 'none') {
      requestObject.body = generateBody(itemRequest.body);
    }
    return requestObject;
  };

  const generateResponseExamples = (examples) => {
    if (!examples || !Array.isArray(examples)) {
      return [];
    }

    return map(examples, (example) => {
      if (!example) {
        return null;
      }

      const postmanResponse = {
        name: example.name || 'Example Response',
        originalRequest: generateOriginalRequest(example.request),
        status: example.response?.statusText || 'OK',
        code: parseInt(example.response?.status) || 200,
        header: generateResponseHeaders(example.response?.headers),
        cookie: [],
        body: example.response?.body?.content || ''
      };

      // Add preview language based on content type
      const contentType = getContentTypeFromHeaders(example.response?.headers);
      if (contentType) {
        if (contentType.includes('application/json')) {
          postmanResponse._postman_previewlanguage = 'json';
        } else if (contentType.includes('application/xml') || contentType.includes('text/xml')) {
          postmanResponse._postman_previewlanguage = 'xml';
        } else if (contentType.includes('text/html')) {
          postmanResponse._postman_previewlanguage = 'html';
        } else if (contentType.includes('text/plain')) {
          postmanResponse._postman_previewlanguage = 'text';
        }
      }

      return postmanResponse;
    }).filter(Boolean); // Remove null entries
  };

  const generateOriginalRequest = (request) => {
    if (!request) {
      return {
        method: 'GET',
        header: [],
        url: { raw: '', protocol: 'https', host: [], path: [] }
      };
    }

    const originalRequestObject = {
      method: request.method || 'GET',
      header: generateHeaders(request.headers),
      // We sanitize the URL to make sure it's in the right format before passing it to the transformUrl func. This means changing backslashes to forward slashes and reducing multiple slashes to a single one, except in the protocol part.
      url: transformUrl(sanitizeUrl(request.url || ''), request.params || [])
    };

    // Add body if it exists and is not 'none' mode
    if (request.body && request.body.mode !== 'none') {
      originalRequestObject.body = generateBody(request.body);
    }

    return originalRequestObject;
  };

  const generateResponseHeaders = (headers) => {
    if (!headers || !Array.isArray(headers)) {
      return [];
    }

    return map(headers, (header) => {
      return {
        key: header.name || '',
        value: header.value || '',
        name: header.name || '',
        description: header.description || '',
        type: 'text'
      };
    });
  };

  const getContentTypeFromHeaders = (headers) => {
    if (!headers || !Array.isArray(headers)) {
      return null;
    }

    const contentTypeHeader = headers.find((header) =>
      header.name && header.name.toLowerCase() === 'content-type');

    return contentTypeHeader ? contentTypeHeader.value : null;
  };

  const generateItemSection = (itemsArray) => {
    if (!itemsArray || !Array.isArray(itemsArray)) {
      return [];
    }

    const sortedItems = sortItemsForExport(itemsArray);

    return map(sortedItems, (item) => {
      if (!item) {
        return null;
      }

      if (item.type === 'grpc-request') {
        return null;
      }

      if (item.type === 'folder') {
        const folderEvents = generateEventSection(item);
        return {
          name: item.name || 'Untitled Folder',
          item: generateItemSection(item.items),
          ...(folderEvents.length ? { event: folderEvents } : {})
        };
      } else if (isItemARequest(item)) {
        const requestEvents = generateEventSection(item.request);
        const method = (item.request?.method || 'GET').toUpperCase();
        const hasBody = item.request?.body && item.request.body.mode !== 'none';

        const methodsWithoutBody = ['GET', 'HEAD', 'OPTIONS'];
        const needsBodyPruningDisabled = hasBody && methodsWithoutBody.includes(method);

        const postmanItem = {
          name: item.name || 'Untitled Request',
          ...(needsBodyPruningDisabled ? { protocolProfileBehavior: { disableBodyPruning: true } } : {}),
          request: generateRequestSection(item.request),
          ...(requestEvents.length ? { event: requestEvents } : {})
        };

        // Add examples (responses) if they exist
        if (item.examples && Array.isArray(item.examples) && item.examples.length > 0) {
          postmanItem.response = generateResponseExamples(item.examples);
        }

        return postmanItem;
      }
      return null;
    }).filter(Boolean);
  };
  const collectionToExport = {};
  collectionToExport.info = generateInfoSection();
  collectionToExport.item = generateItemSection(collection.items);
  collectionToExport.variable = generateCollectionVars(collection);
  const collectionEvents = generateEventSection(collection.root);
  if (collectionEvents.length) {
    collectionToExport.event = collectionEvents;
  }
  return collectionToExport;
};

export default brunoToPostman;
