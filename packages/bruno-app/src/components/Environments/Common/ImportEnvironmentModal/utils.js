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
  CREATE_NEW: 'create_new',
  REPLACE: 'replace'
};

export const RESOLUTION_OPTIONS = [
  { value: RESOLUTION_TYPES.CREATE_NEW, label: 'New', title: 'Import as a new environment', testId: 'env-import-create-new-btn' },
  { value: RESOLUTION_TYPES.REPLACE, label: 'Replace', title: 'Replace existing', testId: 'env-import-replace-btn' }
];
