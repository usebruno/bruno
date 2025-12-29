import * as FileSaver from 'file-saver';
import jsyaml from 'js-yaml';
import { brunoToOpenCollection } from '@usebruno/converters';
import { sanitizeName } from 'utils/common/regex';

export const exportCollection = (collection, version) => {
  const openCollection = brunoToOpenCollection(collection);

  if (!openCollection.extensions) {
    openCollection.extensions = {};
  }
  openCollection.extensions.exportedAt = new Date().toISOString();
  openCollection.extensions.exportedUsing = version ? `Bruno/${version}` : 'Bruno';

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
