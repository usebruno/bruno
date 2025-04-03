import map from 'lodash/map';
import { deleteSecretsInEnvs, deleteUidsInEnvs, deleteUidsInItems } from '../collections/export';
import { saveFile } from '../common/file';

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
    switch (itemAuth) {
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
    }
  };

  const generateHost = (url) => {
    try {
      const { hostname } = new URL(url);
      return hostname.split('.');
    } catch (error) {
      console.error(`Invalid URL: ${url}`, error);
      return [];
    }
  };

  const generatePathParams = (params) => {
    return params.filter((param) => param.type === 'path').map((param) => `:${param.name}`);
  };

  const generateQueryParams = (params) => {
    return params
      .filter((param) => param.type === 'query')
      .map(({ name, value, description }) => ({ key: name, value, description }));
  };

  const generateVariables = (params) => {
    return params
      .filter((param) => param.type === 'path')
      .map(({ name, value, description }) => ({ key: name, value, description }));
  };

  const generateRequestSection = (itemRequest) => {
    const requestObject = {
      method: itemRequest.method,
      header: generateHeaders(itemRequest.headers),
      auth: generateAuth(itemRequest.auth),
      description: itemRequest.docs,
      url: {
        raw: itemRequest.url,
        host: generateHost(itemRequest.url),
        path: generatePathParams(itemRequest.params),
        query: generateQueryParams(itemRequest.params),
        variable: generateVariables(itemRequest.params)
      },
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

  saveFile(fileBlob, fileName).then(() => {
    console.log(`Collection exported as ${fileName}`);
  });
};

export default exportCollection;
