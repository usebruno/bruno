export const HTTP_SCRIPT_KEYS = ['req', 'res'];

export const GRPC_SCRIPT_KEYS = ['beforeCallStart', 'afterCallEnd'];

export const SCRIPT_TYPES = Object.freeze({
  PRE_REQUEST: 'pre-request',
  POST_RESPONSE: 'post-response',
  TEST: 'test',
  BEFORE_CALL_START: 'before-call-start',
  AFTER_CALL_END: 'after-call-end'
} as const);
