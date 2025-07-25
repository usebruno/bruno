import { parentPort } from 'worker_threads';
import { bruRequestToJson, jsonRequestToBru } from '../formats/bru';

interface WorkerMessage {
  taskType: 'parse' | 'stringify';
  data: any;
}

parentPort?.on('message', async (message: WorkerMessage) => {
  try {
    const { taskType, data } = message;
    let result: any;

    if (taskType === 'parse') {
      result = bruRequestToJson(data);
    } else if (taskType === 'stringify') {
      result = jsonRequestToBru(data);
    } else {
      throw new Error(`Unknown task type: ${taskType}`);
    }

    parentPort?.postMessage(result);
  } catch (error: any) {
    console.error('Worker error:', error);
    parentPort?.postMessage({ error: error?.message });
  }
}); 