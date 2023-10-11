import { BrunoError } from 'utils/common/error';
import map from 'lodash/map';
import { deleteSecretsInEnvs, deleteUidsInEnvs, deleteUidsInItems } from 'utils/collections/export';

export const exportCollection = (collection) => {
  delete collection.uid;
  deleteUidsInItems(collection.items);
  deleteUidsInEnvs(collection.environments);
  deleteSecretsInEnvs(collection.environments);

  const generateInfoSection = () => {
    return {
      name: collection.name,
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
    };
  };

  const generateEventSection = (item) => {
    const eventArray = [];
    if (item.request.tests.length) {
      eventArray.push({
        listen: 'test',
        script: {
          exec: item.request.tests.split('\n')
          // type: 'text/javascript'
        }
      });
    }
    if (item.request.script.req) {
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
    }
  };

  const generateRequestSection = (itemRequest) => {
    const requestObject = {
      method: itemRequest.method,
      header: generateHeaders(itemRequest.headers),
      url: {
        raw: itemRequest.url,
        protocol: itemRequest.url.split('://')[0]
      }
      // host: TODO
      // path: TODO
    };

    if (itemRequest.body.mode != 'none') {
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
  console.log(collectionToExport);
};

export default exportCollection;
