import { BrunoError } from 'utils/common/error';
import { insomniaToBruno } from '@usebruno/converters';


export const convertInsomniaToBruno = (data) => {
  try {
    return insomniaToBruno(data);
  } catch (err) {
    console.error('Error converting Insomnia to Bruno:', err);
    throw new BrunoError('Conversion failed');
  }
};
