import crypto from 'node:crypto';

export const createWsseHeader = (username: string, password: string): string => {
  const ts = new Date().toISOString();
  const nonce = crypto.randomBytes(16).toString('hex');

  const hash = crypto.createHash('sha1');
  hash.update(nonce + ts + password);
  const digest = Buffer.from(hash.digest('hex').toString('utf8')).toString('base64');

  return `UsernameToken Username="${username}", PasswordDigest="${digest}", Nonce="${nonce}", Created="${ts}"`;
};

export const applyWsseAuth = (
  headers: Record<string, string>,
  username: string,
  password: string
): void => {
  headers['X-WSSE'] = createWsseHeader(username, password);
};
