import { BrunoError } from 'utils/common/error';
import { openApiToBruno } from '@usebruno/converters';

export const convertOpenapiToBruno = (data) => {
  try {
    return openApiToBruno(data);
  } catch (err) {
    console.error('Error converting OpenAPI to Bruno:', err);
    throw new BrunoError('Import collection failed: ' + err.message);
  }
};

export const isOpenApiSpec = (data) => {
  if (typeof data.info !== 'object' || data.info === null) {
    return false;
  }

  if (typeof data.openapi === 'string' && data.openapi.trim().length) {
    return true;
  }

  if (typeof data.swagger === 'string' && data.swagger.trim().length) {
    return true;
  }

  return false;
};
