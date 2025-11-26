import { BrunoError } from 'utils/common/error';
import { insomniaToBruno } from '@usebruno/converters';


export const convertInsomniaToBruno = (data) => {
  try {
    return insomniaToBruno(data);
  } catch (err) {
    console.error('Error converting Insomnia to Bruno:', err);
    throw new BrunoError('Import collection failed: ' + err.message);
  }
};

export const isInsomniaCollection = (data) => {
  // Check for Insomnia v5 collection format – collection array must be present
  if (typeof data.type === 'string' && data.type.startsWith('collection.insomnia.rest/5')) {
    return Array.isArray(data.collection);
  }

  // Check for Insomnia v4 export format – must have __export_format and resources array
  if (data._type === 'export') {
    return Array.isArray(data.resources) && typeof data.__export_format === 'number';
  }

  return false;
};
