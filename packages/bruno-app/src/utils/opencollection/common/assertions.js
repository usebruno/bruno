import { uuid } from 'utils/common';

export const toBrunoAssertions = (assertions) => {
  if (!assertions?.length) return [];

  return assertions.map((a) => ({
    uid: uuid(),
    name: a.expression || '',
    value: a.value || '',
    description: a.description || '',
    enabled: a.disabled !== true
  }));
};

export const toOpenCollectionAssertions = (assertions) => {
  if (!assertions?.length) return undefined;

  return assertions.map((a) => ({
    expression: a.name || '',
    operator: a.operator || 'eq',
    value: a.value || '',
    ...(a.enabled === false && { disabled: true }),
    ...(a.description && { description: a.description })
  }));
};
