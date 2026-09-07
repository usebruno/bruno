/**
 * Autocomplete hints for the gRPC script hooks.
 *
 * gRPC hooks get no `req` / `res` globals — the models hang off `bru.grpc` instead, and which
 * parts of them exist depends on the hook. So the exported groups are keyed by hook rather than
 * by root global, and every entry below hangs off `bru`.
 *
 * Mirrors GrpcScriptRuntime in @usebruno/js; keep the two in step.
 */

const GRPC_REQUEST = 'bru.grpc.request';
const GRPC_RESPONSE = 'bru.grpc.response';

const METADATA_READ_METHODS = [
  'get(key)',
  'one(key)',
  'has(key)',
  'has(key, value)',
  'all()',
  'count()',
  'indexOf(item)',
  'find(fn)',
  'filter(fn)',
  'each(fn)',
  'map(fn)',
  'reduce(fn, initialValue)',
  'toObject()',
  'toString()',
  'toJSON()'
];

// Writable only on the request, and only in `beforeCallStart` — the others throw.
const METADATA_WRITE_METHODS = ['upsert(key, value)', 'add(item)', 'remove(key)', 'clear()'];

// GrpcMessageList, always read-only on both the request and the response.
const MESSAGE_LIST_METHODS = [
  'all()',
  'get(index)',
  'count()',
  'find(fn)',
  'filter(fn)',
  'map(fn)',
  'each(fn)',
  'reduce(fn, initialValue)',
  'toJSON()'
];

const withPrefix = (prefix, names) => names.map((name) => `${prefix}.${name}`);

// GrpcMessage — the single message a message hook is handed.
const MESSAGE_FIELDS = ['data', 'timestamp'];

const REQUEST_HINTS = [
  `${GRPC_REQUEST}.url`,
  `${GRPC_REQUEST}.method`,
  `${GRPC_REQUEST}.methodType`,
  `${GRPC_REQUEST}.authMode`,
  `${GRPC_REQUEST}.protoPath`,
  `${GRPC_REQUEST}.name`,
  ...withPrefix(`${GRPC_REQUEST}.metadata`, METADATA_READ_METHODS),
  ...withPrefix(`${GRPC_REQUEST}.messages`, MESSAGE_LIST_METHODS)
];

const RESPONSE_HINTS = [
  `${GRPC_RESPONSE}.statusCode`,
  `${GRPC_RESPONSE}.statusText`,
  `${GRPC_RESPONSE}.duration`,
  ...withPrefix(`${GRPC_RESPONSE}.metadata`, METADATA_READ_METHODS),
  ...withPrefix(`${GRPC_RESPONSE}.trailers`, METADATA_READ_METHODS),
  ...withPrefix(`${GRPC_RESPONSE}.messages`, MESSAGE_LIST_METHODS)
];

export const GRPC_API_HINTS = {
  'grpc:before-call-start': [
    ...REQUEST_HINTS,
    // The only hook that can still change metadata — the call has not been sent yet.
    ...withPrefix(`${GRPC_REQUEST}.metadata`, METADATA_WRITE_METHODS)
  ],
  'grpc:before-message-send': [
    ...REQUEST_HINTS,
    // The message about to be sent.
    ...withPrefix(`${GRPC_REQUEST}.message`, MESSAGE_FIELDS)
  ],
  'grpc:after-message-receive': [
    ...REQUEST_HINTS,
    ...RESPONSE_HINTS,
    ...withPrefix(`${GRPC_RESPONSE}.message`, MESSAGE_FIELDS)
  ],
  'grpc:after-call-end': [...REQUEST_HINTS, ...RESPONSE_HINTS]
};
