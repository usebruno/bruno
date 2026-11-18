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

export const AUTH_MODE_IDS = {
  AWSV4: 'awsv4',
  BASIC: 'basic',
  BEARER: 'bearer',
  DIGEST: 'digest',
  NTLM: 'ntlm',
  OAUTH1: 'oauth1',
  OAUTH2: 'oauth2',
  WSSE: 'wsse',
  APIKEY: 'apikey',
  INHERIT: 'inherit',
  NONE: 'none'
} as const satisfies Record<keyof typeof AUTH_MODE_LABELS, string>;

// The selected-mode control uses different labels from the menu for these modes.
export const SELECTED_AUTH_MODE_LABELS = {
  ...AUTH_MODE_LABELS,
  AWSV4: 'AWS Sig V4',
  NTLM: 'NTLM'
} as const;

export const API_KEY_PLACEMENT_LABELS = {
  header: 'Header',
  queryparams: 'Query Params'
} as const;

export type ApiKeyPlacement = keyof typeof API_KEY_PLACEMENT_LABELS;
