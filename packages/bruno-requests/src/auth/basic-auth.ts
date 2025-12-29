export const createBasicAuthHeader = (username: string, password: string): string => {
  return `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
};

export const applyBasicAuth = (
  headers: Record<string, string>,
  username: string,
  password: string
): void => {
  headers['Authorization'] = createBasicAuthHeader(username, password);
};
