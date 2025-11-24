import type { Item as BrunoItem } from '@usebruno/schema-types/collection/item';
import type { Script } from '@opencollection/types/collection/item';
import { uuid } from '../../../utils';

const parseScript = (ocScript: Script): BrunoItem => {
  const brunoItem: BrunoItem = {
    uid: uuid(),
    type: 'js',
    seq: 1,
    name: 'Script',
    tags: [],
    request: null,
    settings: null,
    fileContent: ocScript.script || '',
    root: null,
    items: [],
    examples: [],
    filename: null,
    pathname: null
  };

  return brunoItem;
};

export default parseScript;
