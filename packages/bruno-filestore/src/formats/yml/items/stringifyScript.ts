import type { Item as BrunoItem } from '@usebruno/schema-types/collection/item';
import type { Script } from '@opencollection/types/collection/item';
import { stringifyYml } from '../utils';

const stringifyScript = (item: BrunoItem): string => {
  try {
    const ocScript: Script = {
      type: 'script'
    };

    if (item.fileContent?.trim().length) {
      ocScript.script = item.fileContent;
    }

    return stringifyYml(ocScript);
  } catch (error) {
    console.error('Error stringifying script:', error);
    throw error;
  }
};

export default stringifyScript;
