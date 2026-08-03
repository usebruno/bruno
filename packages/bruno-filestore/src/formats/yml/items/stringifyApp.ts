import type { Item as BrunoItem } from '@usebruno/schema-types/collection/item';
import { stringifyYml } from '../utils';

interface AppFileInfo {
  name: string;
  type: 'app';
  seq?: number;
  tags?: string[];
}

interface AppFile {
  info: AppFileInfo;
  code?: string;
}

// Mirror the request shape (info.name/type/seq/tags + body) so apps round-trip
// the same fields and can be reordered via seq like every other item.
const stringifyApp = (item: BrunoItem): string => {
  try {
    const info: AppFileInfo = {
      name: item.name && item.name.trim().length ? item.name : 'App',
      type: 'app'
    };
    if (typeof item.seq === 'number') {
      info.seq = item.seq;
    }
    if (Array.isArray(item.tags) && item.tags.length) {
      info.tags = item.tags;
    }

    const ocApp: AppFile = { info };

    const code = item.app?.code;
    if (code && code.trim().length) {
      ocApp.code = code;
    }

    return stringifyYml(ocApp);
  } catch (error) {
    console.error('Error stringifying app:', error);
    throw error;
  }
};

export default stringifyApp;
