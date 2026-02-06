import * as FileSaver from 'file-saver';
import jsyaml from 'js-yaml';
import { brunoToOpenCollection } from '@usebruno/converters';
import { sanitizeName } from 'utils/common/regex';
import { filterTransientItems } from 'utils/collections';

export const exportCollection = (collection, version) => {
  // Filter out transient items before export
  collection.items = filterTransientItems(collection.items);

  const openCollection = brunoToOpenCollection(collection);

  if (!openCollection.extensions) {
    openCollection.extensions = {};
  }
  if (!openCollection.extensions.bruno) {
    openCollection.extensions.bruno = {};
  }
  openCollection.extensions.bruno.exportedAt = new Date().toISOString();
  openCollection.extensions.bruno.exportedUsing = version ? `Bruno/${version}` : 'Bruno';

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
