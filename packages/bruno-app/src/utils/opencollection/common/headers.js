import { uuid } from 'utils/common';

export const toBrunoHeaders = (headers) => {
  if (!headers?.length) return [];

  return headers.map((header) => ({
    uid: uuid(),
    name: header.name || '',
    value: header.value || '',
    description: header.description || '',
    enabled: header.disabled !== true
  }));
};

export const toOpenCollectionHeaders = (headers) => {
  if (!headers?.length) return undefined;

  return headers.map((header) => ({
    name: header.name || '',
    value: header.value || '',
    ...(header.description && { description: header.description }),
    ...(header.enabled === false && { disabled: true })
  }));
};
