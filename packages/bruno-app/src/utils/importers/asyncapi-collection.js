import { BrunoError } from 'utils/common/error';
import { asyncApiToBruno } from '@usebruno/converters';

export const convertAsyncApiToBruno = (data) => {
  try {
    return asyncApiToBruno(data);
  } catch (err) {
    console.error('Error converting AsyncAPI to Bruno:', err);
    throw new BrunoError('Import collection failed: ' + err.message);
  }
};

export const isAsyncApiSpec = (data) => Boolean(data && typeof data === 'object' && typeof data.asyncapi === 'string' && /^\s*\d+\./.test(data.asyncapi));
