import { uuid } from 'utils/common';

export const toBrunoParams = (params) => {
  if (!params?.length) return [];

  return params.map((param) => ({
    uid: uuid(),
    name: param.name || '',
    value: param.value || '',
    description: param.description || '',
    type: param.type || 'query',
    enabled: param.disabled !== true
  }));
};

export const toOpenCollectionParams = (params) => {
  if (!params?.length) return undefined;

  return params.map((param) => ({
    name: param.name || '',
    value: param.value || '',
    type: param.type || 'query',
    ...(param.description && { description: param.description }),
    ...(param.enabled === false && { disabled: true })
  }));
};
