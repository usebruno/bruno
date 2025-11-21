import { parentPort } from 'node:worker_threads';
import { bruRequestToJson, jsonRequestToBru } from '../formats/bru';
import { yamlRequestToJson, jsonRequestToYaml } from '../formats/yaml';

interface WorkerMessage {
  taskType: 'parse' | 'stringify';
  data: {
    data: any;
    format?: 'bru' | 'yaml';
  };
}

parentPort?.on('message', async (message: WorkerMessage) => {
  try {
    const { taskType, data: messageData } = message;
    const { data, format = 'bru' } = messageData;
    let result: any;

    if (taskType === 'parse') {
      if (format === 'yaml') {
        result = yamlRequestToJson(data);
      } else {
        result = bruRequestToJson(data);
      }
    } else if (taskType === 'stringify') {
      if (format === 'yaml') {
        result = jsonRequestToYaml(data);
      } else {
        result = jsonRequestToBru(data);
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