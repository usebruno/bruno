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

const parseGraphQL = (text) => {
  try {
    const graphql = JSON.parse(text);

    return {
      query: graphql.query,
      variables: JSON.stringify(graphql.variables, null, 2)
    };
  } catch (e) {
    return {
      query: '',
      variables: {}
    };
  }
};

const transformInsomniaRequestItem = (request) => {
  const brunoRequestItem = {
    uid: uuid(),
    name: request.name,
    type: 'http-request',
    request: {
      url: request.url,
      method: request.method,
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

  each(request.headers, (header) => {
    brunoRequestItem.request.headers.push({
      uid: uuid(),
      name: header.name,
      value: header.value,
      description: header.description,
      enabled: !header.disabled
    });
  });

  each(request.parameters, (param) => {
    brunoRequestItem.request.params.push({
      uid: uuid(),
      name: param.name,
      value: param.value,
      description: param.description,
      enabled: !param.disabled
    });
  });

  const mimeType = get(request, 'body.mimeType', '');

  if (mimeType === 'application/json') {
    brunoRequestItem.request.body.mode = 'json';
    brunoRequestItem.request.body.json = request.body.text;
  } else if (mimeType === 'application/x-www-form-urlencoded') {
    brunoRequestItem.request.body.mode = 'formUrlEncoded';
    each(request.body.params, (param) => {
      brunoRequestItem.request.body.formUrlEncoded.push({
        uid: uuid(),
        name: param.name,
        value: param.value,
        description: param.description,
        enabled: !param.disabled
      });
    });
  } else if (mimeType === 'multipart/form-data') {
    brunoRequestItem.request.body.mode = 'multipartForm';
    each(request.body.params, (param) => {
      brunoRequestItem.request.body.multipartForm.push({
        uid: uuid(),
        name: param.name,
        value: param.value,
        description: param.description,
        enabled: !param.disabled
      });
    });
  } else if (mimeType === 'text/plain') {
    brunoRequestItem.request.body.mode = 'text';
    brunoRequestItem.request.body.text = request.body.text;
  } else if (mimeType === 'text/xml') {
    brunoRequestItem.request.body.mode = 'xml';
    brunoRequestItem.request.body.xml = request.body.text;
  } else if (mimeType === 'application/graphql') {
    brunoRequestItem.type = 'graphql-request';
    brunoRequestItem.request.body.mode = 'graphql';
    brunoRequestItem.request.body.graphql = parseGraphQL(request.body.text);
  }

  return brunoRequestItem;
};

const parseInsomniaCollection = (data) => {
  const brunoCollection = {
    name: '',
    uid: uuid(),
    version: '1',
    items: [],
    environments: []
  };

  return new Promise((resolve, reject) => {
    try {
      const insomniaExport = JSON.parse(data);
      const insomniaResources = get(insomniaExport, 'resources', []);
      const insomniaCollection = insomniaResources.find((resource) => resource._type === 'workspace');

      if (!insomniaCollection) {
        reject(new BrunoError('Collection not found inside Insomnia export'));
      }

      brunoCollection.name = insomniaCollection.name;

      const requestsAndFolders =
        insomniaResources.filter((resource) => resource._type === 'request' || resource._type === 'request_group') ||
        [];

      function createFolderStructure(resources, parentId = null) {
        const requestGroups =
          resources.filter((resource) => resource._type === 'request_group' && resource.parentId === parentId) || [];
        const requests = resources.filter((resource) => resource._type === 'request' && resource.parentId === parentId);

        const folders = requestGroups.map((folder) => {
          const requests = resources.filter(
            (resource) => resource._type === 'request' && resource.parentId === folder._id
          );

          return {
            uid: uuid(),
            name: folder.name,
            type: 'folder',
            items: createFolderStructure(resources, folder._id).concat(requests.map(transformInsomniaRequestItem))
          };
        });

        return folders.concat(requests.map(transformInsomniaRequestItem));
      }

      (brunoCollection.items = createFolderStructure(requestsAndFolders, insomniaCollection._id)),
        resolve(brunoCollection);
    } catch (err) {
      reject(new BrunoError('An error occurred while parsing the Insomnia collection'));
    }
  });
};

const importCollection = () => {
  return new Promise((resolve, reject) => {
    fileDialog({ accept: 'application/json' })
      .then(readFile)
      .then(parseInsomniaCollection)
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
