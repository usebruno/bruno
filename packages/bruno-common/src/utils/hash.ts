export const simpleHash = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash &= hash; // Convert to 32bit integer
  }
  return new Uint32Array([hash])[0].toString(36);
};

export const generateUidBasedOnHash = (str: string): string => {
  const hash = simpleHash(str);

  return `${hash}`.padEnd(21, '0');
};
