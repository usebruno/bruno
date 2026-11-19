export const AUTH_MODE_LABELS = {
  AWSV4: 'AWS Sig v4',
  BASIC: 'Basic Auth',
  BEARER: 'Bearer Token',
  DIGEST: 'Digest Auth',
  NTLM: 'NTLM Auth',
  OAUTH1: 'OAuth 1.0',
  OAUTH2: 'OAuth 2.0',
  WSSE: 'WSSE Auth',
  APIKEY: 'API Key',
  INHERIT: 'Inherit',
  NONE: 'No Auth'
} as const;

/**
 * Labels the auth mode selector shows once a mode is selected. Most match the dropdown entry in
 * AUTH_MODE_LABELS; NTLM and AWS Sig v4 are rendered differently by `humanizeRequestAuthMode`.
 */
export const SELECTED_AUTH_MODE_LABELS = {
  ...AUTH_MODE_LABELS,
  NTLM: 'NTLM',
  AWSV4: 'AWS Sig V4'
} as const;
