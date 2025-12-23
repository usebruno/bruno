import * as FileSaver from 'file-saver';
import jsyaml from 'js-yaml';
import { stringifyBundledCollection } from 'utils/opencollection';

export const brunoToOpenCollection = (collection) => {
  return stringifyBundledCollection(collection);
};

export const exportCollection = (collection) => {
  const openCollection = brunoToOpenCollection(collection);

  const yamlContent = jsyaml.dump(openCollection, {
    indent: 2,
    lineWidth: -1,
    noRefs: true,
    sortKeys: false
  });

  const fileName = `${collection.name}.yml`;
  const fileBlob = new Blob([yamlContent], { type: 'application/x-yaml' });

  FileSaver.saveAs(fileBlob, fileName);
};

export default exportCollection;
