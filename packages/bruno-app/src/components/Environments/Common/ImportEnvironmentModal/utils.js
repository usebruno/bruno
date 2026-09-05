export const detectEnvironmentFormat = (data) => {
  if (data.info && data.info.type === 'bruno-environment') {
    return 'bruno';
  } else if (Array.isArray(data)) {
    return data.some((env) => env.info && env.info.type === 'bruno-environment') ? 'bruno' : 'postman';
  } else if (data.id && data.values) {
    return 'postman';
  }
  return 'bruno';
};

export const RESOLUTION_TYPES = {
  CUSTOM: 'custom',
  COPY: 'copy',
  REPLACE: 'replace'
};

export const RESOLUTION_SHORT_LABELS = {
  [RESOLUTION_TYPES.COPY]: 'Clone',
  [RESOLUTION_TYPES.REPLACE]: 'Replace'
};

export const RESOLUTION_LABELS = {
  [RESOLUTION_TYPES.CUSTOM]: 'Custom',
  [RESOLUTION_TYPES.COPY]: 'Import as clone',
  [RESOLUTION_TYPES.REPLACE]: 'Replace existing'
};
