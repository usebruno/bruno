import crypto from 'crypto';
import { AuthMode } from '../types';
import { URL } from 'node:url';
import { RequestOptions } from 'http';

type DigestAuthDetails = {
  algorithm: string;
  'Digest realm': string;
  nonce: string;
};

function hash(input: string, algo: string) {
  return crypto.createHash(algo).update(input).digest('hex');
}

export function handleDigestAuth(
  statusCode: number,
  headers: Record<string, string | string[] | undefined>,
  originalRequest: RequestOptions,
  auth: AuthMode
): boolean {
  if (
    auth.mode !== 'digest' || // Only execute if user configured digest as auth mode
    statusCode !== 401 || // Only Apply auth if we really are unauthorized
    !headers['www-authenticate'] || // Check if the Server returned the Auth details
    // @ts-expect-error This header object is set up us, by the type for it is more broad
    !!originalRequest.headers['authorization'] // Check if we already sent the Authorization header
  ) {
    return false;
  }

  const authDetails = String(headers['www-authenticate'])
    .split(', ')
    .map((v) => v.split('=').map((str) => str.replace(/"/g, '')))
    .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {}) as DigestAuthDetails;

  const nonceCount = '00000001';
  const cnonce = crypto.randomBytes(24).toString('hex');
  const uri = new URL(originalRequest.path!, `${originalRequest.protocol}//${originalRequest.hostname}`).pathname;

  let algo = 'md5';
  switch (authDetails.algorithm.toLowerCase()) {
    case 'sha-256':
    case 'sha256':
      algo = 'sha256';
      break;
    case 'sha-512':
    case 'sha512':
      algo = 'sha512';
      break;
  }

  const ha1 = hash(`${auth.digest.username}:${authDetails['Digest realm']}:${auth.digest.password}`, algo);
  const ha2 = hash(`${originalRequest.method}:${uri}`, algo);
  const response = hash(`${ha1}:${authDetails.nonce}:${nonceCount}:${cnonce}:auth:${ha2}`, algo);

  const authorizationHeader =
    `Digest username="${auth.digest.username}",realm="${authDetails['Digest realm']}",` +
    `nonce="${authDetails.nonce}",uri="${uri}",qop="auth",algorithm="${authDetails.algorithm}",` +
    `response="${response}",nc="${nonceCount}",cnonce="${cnonce}"`;

  originalRequest.headers!['authorization'] = authorizationHeader;

  return false;
}
