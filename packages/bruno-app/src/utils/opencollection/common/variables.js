import { uuid } from 'utils/common';

export const toBrunoVariables = (variables) => {
  if (!variables?.length) return { req: [], res: [] };

  return {
    req: variables.map((v) => ({
      uid: uuid(),
      name: v.name || '',
      value: typeof v.value === 'object' ? v.value.data || '' : v.value || '',
      description: v.description || '',
      enabled: v.disabled !== true
    })),
    res: []
  };
};

export const toOpenCollectionVariables = (vars) => {
  const reqVars = vars?.req || [];
  if (!reqVars.length) return undefined;

  return reqVars.map((v) => ({
    name: v.name || '',
    value: v.value || '',
    ...(v.description && { description: v.description }),
    ...(v.enabled === false && { disabled: true })
  }));
};
