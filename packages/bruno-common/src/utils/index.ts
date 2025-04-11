export const flattenObject = (obj: Record<string, any>, parentKey: string = ''): Record<string, any> => {
  return Object.entries(obj).reduce((acc: Record<string, any>, [key, value]: [string, any]) => {
    const newKey = parentKey ? (Array.isArray(obj) ? `${parentKey}[${key}]` : `${parentKey}.${key}`) : key;
    if (typeof value === 'object' && value !== null) {
      Object.assign(acc, flattenObject(value, newKey));
    } else {
      acc[newKey] = value;
    }
    return acc;
  }, {});
};
