// OpenID Connect Discovery 1.0 — fetch `.well-known/openid-configuration` from an OP issuer URL
// and return the parsed metadata.
//
// Bruno uses this to auto-populate the authorization endpoint, token endpoint, PAR endpoint, JWKS
// URI, userinfo / logout endpoints, and to learn which signing algorithms / client-auth methods
// the OP supports.

import axios, { AxiosInstance } from 'axios';

export interface OidcMetadata {
  issuer: string;
  authorization_endpoint?: string;
  token_endpoint?: string;
  pushed_authorization_request_endpoint?: string;
  userinfo_endpoint?: string;
  end_session_endpoint?: string;
  jwks_uri?: string;
  scopes_supported?: string[];
  response_types_supported?: string[];
  response_modes_supported?: string[];
  grant_types_supported?: string[];
  token_endpoint_auth_methods_supported?: string[];
  token_endpoint_auth_signing_alg_values_supported?: string[];
  request_object_signing_alg_values_supported?: string[];
  require_pushed_authorization_requests?: boolean;
  [key: string]: any;
}

const DISCOVERY_SUFFIX = '/.well-known/openid-configuration';

/**
 * GETs `${issuerUrl}/.well-known/openid-configuration` and returns the parsed metadata. Trailing
 * slashes on the issuer URL are normalised. Throws if the response is not valid JSON or the
 * `issuer` claim is missing.
 */
export const fetchOpenIDConfiguration = async (
  issuerUrl: string,
  axiosInstance?: AxiosInstance
): Promise<OidcMetadata> => {
  if (!issuerUrl || typeof issuerUrl !== 'string') {
    throw new Error('OIDC discovery requires a non-empty issuer URL');
  }
  const trimmed = issuerUrl.trim().replace(/\/+$/, '');
  const discoveryUrl = `${trimmed}${DISCOVERY_SUFFIX}`;

  const http = axiosInstance || axios;
  const response = await http({
    method: 'GET',
    url: discoveryUrl,
    headers: { Accept: 'application/json' },
    responseType: 'json'
  });

  const data = response.data as OidcMetadata;
  if (!data || typeof data !== 'object' || !data.issuer) {
    throw new Error(`OIDC discovery response from ${discoveryUrl} is not a valid OP metadata document`);
  }
  return data;
};
