import * as FileSaver from 'file-saver';
import get from 'lodash/get';
import each from 'lodash/each';

const deleteUidsInItems = (items) => {
  each(items, (item) => {
    delete item.uid;

    if (['http-request', 'graphql-request'].includes(item.type)) {
      each(get(item, 'request.headers'), (header) => delete header.uid);
      each(get(item, 'request.params'), (param) => delete param.uid);
      each(get(item, 'request.body.multipartForm'), (param) => delete param.uid);
      each(get(item, 'request.body.formUrlEncoded'), (param) => delete param.uid);
    }

    if (item.items && item.items.length) {
      deleteUidsInItems(item.items);
    }
  });
};

const deleteUidsInEnvs = (envs) => {
  each(envs, (env) => {
    delete env.uid;
    each(env.variables, (variable) => delete variable.uid);
  });
};

const exportCollection = (collection) => {
  // delete uids
  delete collection.uid;
  deleteUidsInItems(collection.items);
  deleteUidsInEnvs(collection.environments);

  const fileName = `${collection.name}.json`;
  const fileBlob = new Blob([JSON.stringify(collection, null, 2)], { type: 'application/json' });

  FileSaver.saveAs(fileBlob, fileName);
};

export default exportCollection;
