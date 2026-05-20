// Shared input list for OpenID Connect Code Flow (openid_code) and Hybrid Flow (openid_hybrid).
// `clientSecret` is intentionally absent — it lives inside ClientAuthMethod, conditional on the
// chosen token endpoint authentication method.
const inputsConfig = [
  {
    key: 'authorizationUrl',
    label: 'Authorization URL'
  },
  {
    key: 'accessTokenUrl',
    label: 'Access Token URL'
  },
  {
    key: 'clientId',
    label: 'Client ID'
  },
  {
    key: 'scope',
    label: 'Scope'
  },
  {
    key: 'state',
    label: 'State'
  }
];

export { inputsConfig };
