export const HTTP_SCRIPT_KEYS = ['req', 'res'];

export const GRPC_SCRIPT_KEYS = ['beforeCallStart', 'beforeMessageSend', 'afterMessageReceive', 'afterCallEnd'];

export const SCRIPT_TYPES = Object.freeze({
  PRE_REQUEST: 'pre-request',
  POST_RESPONSE: 'post-response',
  TEST: 'test',
  BEFORE_CALL_START: 'before-call-start',
  AFTER_CALL_END: 'after-call-end',
  BEFORE_MESSAGE_SEND: 'before-message-send',
  AFTER_MESSAGE_RECEIVE: 'after-message-receive'
} as const);
