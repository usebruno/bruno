import workerpool from 'workerpool';
import {
  parseBruRequest,
  parseBruCollection,
  parseBruEnvironment,
  stringifyBruRequest,
  stringifyBruCollection,
  stringifyBruEnvironment
} from '../formats/bru';
import {
  parseYmlItem,
  parseYmlFolder,
  parseYmlEnvironment,
  stringifyYmlItem,
  stringifyYmlFolder,
  stringifyYmlEnvironment
} from '../formats/yml';
import { CollectionFormat } from '../types';
import { DEFAULT_COLLECTION_FORMAT } from '../constants';

type TaskType
  = | 'parse'
    | 'stringify'
    | 'parseFolder'
    | 'stringifyFolder'
    | 'parseEnvironment'
    | 'stringifyEnvironment';

const runTask = (taskType: TaskType, data: any, format: CollectionFormat): any => {
  switch (taskType) {
    case 'parse':
      return format === 'yml' ? parseYmlItem(data) : parseBruRequest(data);
    case 'stringify':
      return format === 'yml' ? stringifyYmlItem(data) : stringifyBruRequest(data);
    case 'parseFolder':
      return format === 'yml' ? parseYmlFolder(data) : parseBruCollection(data);
    case 'stringifyFolder':
      return format === 'yml' ? stringifyYmlFolder(data) : stringifyBruCollection(data, true);
    case 'parseEnvironment':
      return format === 'yml' ? parseYmlEnvironment(data) : parseBruEnvironment(data);
    case 'stringifyEnvironment':
      return format === 'yml' ? stringifyYmlEnvironment(data) : stringifyBruEnvironment(data);
    default:
      throw new Error(`Unknown task type: ${taskType}`);
  }
};

export const runParseTask = (
  taskType: TaskType,
  data: any,
  format: CollectionFormat = DEFAULT_COLLECTION_FORMAT
) => runTask(taskType, data, format);

workerpool.worker({ runParseTask });
