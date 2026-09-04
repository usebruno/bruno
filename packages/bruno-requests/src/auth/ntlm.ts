import { AxiosRequestConfig } from 'axios';
import { isSameOrigin } from '@usebruno/common/utils';

// The scheme is not in IANA's http registry; it is specified by [MS-NTHT] NTLM Over HTTP Protocol,
// https://learn.microsoft.com/openspecs/windows_protocols/ms-ntht/f09cf6e1-529e-403b-a8a5-7368ee096a6a
const NTLM_SCHEME = /^NTLM(\s|$)/i;

export const isNtlmAuthHeader = (value: unknown): boolean =>
  typeof value === 'string' && NTLM_SCHEME.test(value.trim());

const carriesNtlm = (headers: Record<string, unknown>): boolean =>
  Object.keys(headers).some((key) => key.toLowerCase() === 'authorization' && isNtlmAuthHeader(headers[key]));

export const handleNtlmRedirect = (
  requestConfig: AxiosRequestConfig,
  fromUrl: string,
  redirectUrl: string,
  forwardAuthorizationHeader: boolean
): void => {
  const headers = requestConfig.headers ?? {};

  if (!carriesNtlm(headers)) {
    return;
  }

  // A finished message proves nothing on the socket a redirect opens, and X-retry
  // would stop the library negotiating a new one.
  Object.keys(headers).forEach((key) => {
    const lowerKey = key.toLowerCase();
    if (lowerKey === 'x-retry' || lowerKey === 'authorization') {
      delete headers[key];
    }
  });

  // Dropping the inherited plain adapter puts the ntlm code back in the path to answer a fresh
  // challenge. Another host only earns that when the request forwards Authorization; otherwise the
  // redirect ends on its 401, as curl does by default.
  if (isSameOrigin(fromUrl, redirectUrl) || forwardAuthorizationHeader) {
    delete requestConfig.adapter;
  }
};
