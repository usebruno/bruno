export const normalizeEnvName = (name) => (name || '').toLowerCase().trim();

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
