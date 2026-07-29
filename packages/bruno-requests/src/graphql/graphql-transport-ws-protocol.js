/**
 * Wire vocabulary for the `graphql-transport-ws` subprotocol
 * (https://github.com/enisdenjo/graphql-ws/blob/master/PROTOCOL.md).
 */

export const MESSAGE_TYPES = {
  CONNECTION_INIT: 'connection_init',
  CONNECTION_ACK: 'connection_ack',
  PING: 'ping',
  PONG: 'pong',
  SUBSCRIBE: 'subscribe',
  NEXT: 'next',
  ERROR: 'error',
  COMPLETE: 'complete'
};

export const CLOSE_CODE_DESCRIPTIONS = {
  4400: 'Bad Request',
  4401: 'Unauthorized',
  4403: 'Forbidden',
  4406: 'Subprotocol Not Acceptable',
  4408: 'Connection Initialisation Timeout',
  4409: 'Subscriber Already Exists',
  4429: 'Too Many Initialisation Requests',
  4500: 'Internal Error'
};

export const encodeConnectionInit = (payload) => {
  const frame = { type: MESSAGE_TYPES.CONNECTION_INIT };
  if (payload !== undefined && payload !== null) {
    frame.payload = payload;
  }
  return JSON.stringify(frame);
};

// Some servers reject an explicit `null`/absent field rather than simply ignoring it,
// so operationName/variables/extensions are omitted entirely when not provided.
export const encodeSubscribe = (id, { query, operationName, variables, extensions } = {}) => {
  const payload = { query };
  if (operationName !== undefined && operationName !== null) {
    payload.operationName = operationName;
  }
  if (variables !== undefined && variables !== null) {
    payload.variables = variables;
  }
  if (extensions !== undefined && extensions !== null) {
    payload.extensions = extensions;
  }

  return JSON.stringify({ id, type: MESSAGE_TYPES.SUBSCRIBE, payload });
};

export const encodeComplete = (id) => JSON.stringify({ id, type: MESSAGE_TYPES.COMPLETE });

export const encodePing = (payload) => {
  const frame = { type: MESSAGE_TYPES.PING };
  if (payload !== undefined && payload !== null) {
    frame.payload = payload;
  }
  return JSON.stringify(frame);
};

export const encodePong = (payload) => {
  const frame = { type: MESSAGE_TYPES.PONG };
  if (payload !== undefined && payload !== null) {
    frame.payload = payload;
  }
  return JSON.stringify(frame);
};

/**
 * Decodes a raw wire frame. A hostile or non-JSON frame — or one missing a
 * recognized `type` — is rendered as `{ type: 'unparsable', raw }` rather than
 * thrown: Bruno is a client, so it shows hostile server output instead of dying on it.
 */
export const decodeFrame = (raw) => {
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { type: 'unparsable', raw };
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) || typeof parsed.type !== 'string') {
    return { type: 'unparsable', raw };
  }

  return parsed;
};

export const describeCloseCode = (code) => CLOSE_CODE_DESCRIPTIONS[code] || `Unknown (${code})`;
