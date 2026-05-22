export const REQUEST_TYPES = ['http-request', 'graphql-request', 'grpc-request', 'ws-request'];

export const DEFAULT_COLLECTION_FORMAT = 'yml';

export const AUTH_MODES = {
  AWSV4: 'awsv4',
  BASIC: 'basic',
  BEARER: 'bearer',
  DIGEST: 'digest',
  NTLM: 'ntlm',
  OAUTH1: 'oauth1',
  OAUTH2: 'oauth2',
  WSSE: 'wsse',
  APIKEY: 'apikey',
  NONE: 'none',
  INHERIT: 'inherit'
};

// Auth modes supported by WS protocol.
export const SUPPORTED_WS_AUTH_MODES = [
  AUTH_MODES.BASIC,
  AUTH_MODES.BEARER,
  AUTH_MODES.APIKEY,
  AUTH_MODES.OAUTH2,
  AUTH_MODES.NONE,
  AUTH_MODES.INHERIT
];

// Auth modes supported by GRPC protocol
export const SUPPORTED_GRPC_AUTH_MODES = [
  AUTH_MODES.BASIC,
  AUTH_MODES.BEARER,
  AUTH_MODES.APIKEY,
  AUTH_MODES.OAUTH2,
  AUTH_MODES.WSSE,
  AUTH_MODES.NONE,
  AUTH_MODES.INHERIT
];
