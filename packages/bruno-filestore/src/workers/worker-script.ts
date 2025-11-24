import { parentPort } from 'node:worker_threads';
import { parseBruRequest, stringifyBruRequest } from '../formats/bru';
import { parseYmlItem, stringifyYmlItem } from '../formats/yml';
import { CollectionFormat } from '../types';

interface WorkerMessage {
  taskType: 'parse' | 'stringify';
  data: {
    data: any;
    format?: CollectionFormat;
  };
}

parentPort?.on('message', async (message: WorkerMessage) => {
  try {
    const { taskType, data: messageData } = message;
    const { data, format = 'bru' } = messageData;
    let result: any;

    if (taskType === 'parse') {
      if (format === 'yml') {
        result = parseYmlItem(data);
      } else {
        result = parseBruRequest(data);
      }
    } else if (taskType === 'stringify') {
      if (format === 'yml') {
        result = stringifyYmlItem(data);
      } else {
        result = stringifyBruRequest(data);
      }
    } else {
      throw new Error(`Unknown task type: ${taskType}`);
    }

    parentPort?.postMessage(result);
  } catch (error: any) {
    console.error('Worker error:', error);
    parentPort?.postMessage({ error: error?.message });
  }
});