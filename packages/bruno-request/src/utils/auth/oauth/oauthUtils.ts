import crypto from 'crypto';

export const isTokenExpired = (credentials: any) => {
  if (!credentials?.access_token) {
    return true;
  }
  if (!credentials?.expires_in || !credentials.created_at) {
    return false;
  }
  const expiryTime = credentials.created_at + credentials.expires_in * 1000;
  return Date.now() > expiryTime;
};

export const generateCodeVerifier = () => {
  return crypto.randomBytes(22).toString('hex');
};

export const generateCodeChallenge = (codeVerifier: any) => {
  const hash = crypto.createHash('sha256');
  hash.update(codeVerifier);
  const base64Hash = hash.digest('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  return base64Hash;
};
