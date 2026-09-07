export const toBool = (value: any, defaultValue: boolean = true): boolean => {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return defaultValue;
};

export const toNumber = (value: any, defaultValue: number = 0): number => (typeof value === 'number' ? value : defaultValue);
