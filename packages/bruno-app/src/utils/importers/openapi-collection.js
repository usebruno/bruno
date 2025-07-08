import { BrunoError } from 'utils/common/error';
import { openApiToBruno } from '@usebruno/converters';

export const convertOpenapiToBruno = (data) => {
  try {
    return openApiToBruno(data);
  } catch (err) {
    console.error('Error converting OpenAPI to Bruno:', err);
    throw new BrunoError('Conversion failed');
  }
};
