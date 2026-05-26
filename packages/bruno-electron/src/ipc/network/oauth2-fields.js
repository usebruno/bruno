/**
 * Canonical list of OAuth2 fields that Bruno propagates from collection-, folder-, or
 * request-level auth onto the in-flight axios request. Consumed by prepare-request.js
 * (to assemble axiosRequest.oauth2) and interpolate-vars.js (to identify string fields
 * needing {{var}} substitution).
 *
 * Per-grant-type filtering is deliberately NOT done here. Downstream token fetchers and
 * applyTokenEndpointAuth only read the fields meaningful to the active grant type, so
 * extra-undefined fields are harmless. A single unified list avoids the drift that
 * previously left JWT client-auth fields (privateKey, audience, additionalClaims, etc.)
 * unpropagated when OAuth2 was configured at collection or folder scope.
 */
/**
 * Recognised OAuth2 grant types. Used to gate the propagation step in prepare-request.js so
 * that an unknown grantType (e.g. a typo, or a value from a future Bruno that this build
 * doesn't understand) doesn't silently end up on axiosRequest.oauth2.
 */
const KNOWN_OAUTH2_GRANT_TYPES = new Set([
  'authorization_code',
  'client_credentials',
  'password',
  'implicit'
]);

const OAUTH2_FIELDS = [
  'grantType',
  // Endpoints
  'authorizationUrl', 'accessTokenUrl', 'refreshTokenUrl', 'callbackUrl',
  // Credentials
  'clientId', 'clientSecret', 'username', 'password',
  // Authorization-request shape
  'scope', 'state', 'pkce',
  // Token-endpoint client authentication (RFC 7591 §2 / OIDC Core §9 / RFC 8705)
  'credentialsPlacement', // legacy — superseded by tokenEndpointAuthMethod
  'tokenEndpointAuthMethod',
  'tokenEndpointAuthSigningAlg',
  'privateKey', 'privateKeyType', 'privateKeyFormat', 'keyId',
  'audience', 'assertionLifetime', 'additionalClaims',
  // Token placement on subsequent requests
  'credentialsId', 'tokenPlacement', 'tokenHeaderPrefix', 'tokenQueryKey', 'tokenSource',
  // Settings
  'autoFetchToken', 'autoRefreshToken',
  // Additional parameters keyed by stage (authorization / token / refresh)
  'additionalParameters'
];

/**
 * Subset of OAUTH2_FIELDS that carry user-templated string values needing {{var}}
 * interpolation. Booleans (autoFetchToken, autoRefreshToken, pkce), numbers
 * (assertionLifetime), and structured fields (additionalClaims, additionalParameters)
 * are excluded — they're either not interpolatable or handled separately.
 */
const OAUTH2_INTERPOLATABLE_STRING_FIELDS = [
  'authorizationUrl', 'accessTokenUrl', 'refreshTokenUrl', 'callbackUrl',
  'clientId', 'clientSecret', 'username', 'password',
  'scope', 'state',
  'credentialsPlacement',
  'tokenEndpointAuthMethod', 'tokenEndpointAuthSigningAlg',
  'privateKey', 'privateKeyType', 'privateKeyFormat', 'keyId',
  'audience',
  'credentialsId', 'tokenPlacement', 'tokenHeaderPrefix', 'tokenQueryKey', 'tokenSource'
];

/**
 * Copy every defined OAuth2 field from `sourceAuth.oauth2` to a fresh object, applying the
 * additionalParameters default. Returns a plain object suitable for axiosRequest.oauth2.
 */
const collectOAuth2Fields = (sourceAuth) => {
  const out = {};
  for (const k of OAUTH2_FIELDS) {
    const v = sourceAuth?.oauth2?.[k];
    if (v !== undefined) {
      out[k] = v;
    }
  }
  if (!out.additionalParameters) {
    out.additionalParameters = { authorization: [], token: [], refresh: [] };
  }
  return out;
};

module.exports = {
  KNOWN_OAUTH2_GRANT_TYPES,
  OAUTH2_FIELDS,
  OAUTH2_INTERPOLATABLE_STRING_FIELDS,
  collectOAuth2Fields
};
