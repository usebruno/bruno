const REQUEST_TYPES = ['http-request', 'graphql-request', 'grpc-request', 'ws-request'];

const SINGLE_VALUE_HEADERS = new Set([
  'authorization',
  'proxy-authorization',
  'host',
  'content-type',
  'content-length',
  'content-encoding',
  'content-language',
  'content-range',
  'date',
  'expires',
  'last-modified',
  'retry-after',
  'user-agent',
  'referer',
  'origin',
  'location',
  'server',
  'etag',
  'expect',
  'max-forwards',
  'upgrade'
]);

module.exports = { REQUEST_TYPES, SINGLE_VALUE_HEADERS };
