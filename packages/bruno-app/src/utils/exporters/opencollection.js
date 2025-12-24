import * as FileSaver from 'file-saver';
import jsyaml from 'js-yaml';
import { toOpenCollection } from '@usebruno/converters';
import { sanitizeName } from 'utils/common/regex';

export const brunoToOpenCollection = (collection) => {
  return toOpenCollection(collection);
};

export const exportCollection = (collection) => {
  const openCollection = brunoToOpenCollection(collection);

  const yamlContent = jsyaml.dump(openCollection, {
    indent: 2,
    lineWidth: -1,
    noRefs: true,
    sortKeys: false
  });

  const sanitizedName = sanitizeName(collection.name);
  const fileName = `${sanitizedName}.yml`;
  const fileBlob = new Blob([yamlContent], { type: 'application/x-yaml' });

  FileSaver.saveAs(fileBlob, fileName);
};

export default exportCollection;
