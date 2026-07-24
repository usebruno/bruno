/**
 * Script-phase registry — single source of truth for scripting phases (lifecycle hooks where user
 * JS runs). Accessed by dot path, e.g. `SCRIPT_PHASES.HTTP.PRE_REQUEST`; consumers derive their
 * strings from here instead of hardcoding them.
 */

/** Item `type` values (a request's kind). */
export const REQUEST_TYPES = {
  HTTP: 'http-request',
  GRAPHQL: 'graphql-request',
  GRPC: 'grpc-request',
  WS: 'ws-request'
} as const;

export type RequestType = (typeof REQUEST_TYPES)[keyof typeof REQUEST_TYPES];

export interface ScriptPhase {
  /** request type this phase belongs to */
  REQUEST_TYPE: RequestType;
  /** field under `request.script` */
  FIELD: string;
  /** `.yml` block `type` */
  YML_TYPE: string;
  /** `.bru` block `type` (mirrors YML_TYPE) */
  BRU_TYPE: string;
  /** Script-pane tab key / error-formatter value */
  SCRIPT_TYPE: string;
  /** label shown on the tab */
  LABEL: string;
  /** autocomplete hint roots */
  HINTS: string[];
  /** runs before the request/call */
  RUNS_BEFORE?: boolean;
  /** redux error-state field prefix */
  ERROR_STATE_KEY: string;
  /** redux field for this phase's test() results */
  TEST_RESULTS_KEY: string;
}

/** Recursively freeze the registry so consumers can't mutate it. */
const deepFreeze = <T>(obj: T): T => {
  Object.values(obj as Record<string, unknown>).forEach((value) => {
    if (value && typeof value === 'object') {
      deepFreeze(value);
    }
  });
  return Object.freeze(obj);
};

/** The registry, nested by protocol → phase. Each leaf is a {@link ScriptPhase}. */
export const SCRIPT_PHASES = deepFreeze({
  HTTP: {
    PRE_REQUEST: {
      REQUEST_TYPE: 'http-request',
      FIELD: 'req',
      YML_TYPE: 'before-request',
      BRU_TYPE: 'pre-request',
      SCRIPT_TYPE: 'pre-request',
      LABEL: 'Pre Request',
      HINTS: ['req', 'bru'],
      RUNS_BEFORE: true,
      ERROR_STATE_KEY: 'preRequestScriptError',
      TEST_RESULTS_KEY: 'preRequestTestResults'
    },
    POST_RESPONSE: {
      REQUEST_TYPE: 'http-request',
      FIELD: 'res',
      YML_TYPE: 'after-response',
      BRU_TYPE: 'post-response',
      SCRIPT_TYPE: 'post-response',
      LABEL: 'Post Response',
      HINTS: ['req', 'res', 'bru'],
      ERROR_STATE_KEY: 'postResponseScriptError',
      TEST_RESULTS_KEY: 'postResponseTestResults'
    }
  },
  GRPC: {
    BEFORE_CALL_START: {
      REQUEST_TYPE: 'grpc-request',
      FIELD: 'beforeCallStart',
      YML_TYPE: 'grpc:before-call-start',
      BRU_TYPE: 'grpc:before-call-start',
      SCRIPT_TYPE: 'grpc:before-call-start',
      LABEL: 'Before Call',
      HINTS: ['bru'],
      RUNS_BEFORE: true,
      ERROR_STATE_KEY: 'beforeCallStartScriptError',
      TEST_RESULTS_KEY: 'beforeCallStartTestResults'
    },
    BEFORE_MESSAGE_SEND: {
      REQUEST_TYPE: 'grpc-request',
      FIELD: 'beforeMessageSend',
      YML_TYPE: 'grpc:before-message-send',
      BRU_TYPE: 'grpc:before-message-send',
      SCRIPT_TYPE: 'grpc:before-message-send',
      LABEL: 'Before Message',
      HINTS: ['bru'],
      RUNS_BEFORE: true,
      ERROR_STATE_KEY: 'beforeMessageSendScriptError',
      TEST_RESULTS_KEY: 'beforeMessageSendTestResults'
    },
    AFTER_MESSAGE_RECEIVE: {
      REQUEST_TYPE: 'grpc-request',
      FIELD: 'afterMessageReceive',
      YML_TYPE: 'grpc:after-message-receive',
      BRU_TYPE: 'grpc:after-message-receive',
      SCRIPT_TYPE: 'grpc:after-message-receive',
      LABEL: 'After Message',
      HINTS: ['bru'],
      ERROR_STATE_KEY: 'afterMessageScriptError',
      TEST_RESULTS_KEY: 'afterMessageReceiveTestResults'
    },
    AFTER_CALL_END: {
      REQUEST_TYPE: 'grpc-request',
      FIELD: 'afterCallEnd',
      YML_TYPE: 'grpc:after-call-end',
      BRU_TYPE: 'grpc:after-call-end',
      SCRIPT_TYPE: 'grpc:after-call-end',
      LABEL: 'After Call',
      HINTS: ['bru'],
      ERROR_STATE_KEY: 'afterCallEndScriptError',
      TEST_RESULTS_KEY: 'afterCallEndTestResults'
    }
  }
} satisfies Record<string, Record<string, ScriptPhase>>);

/** Flat list of every phase across every protocol. */
export const SCRIPTING_PHASES: ScriptPhase[] = Object.values(SCRIPT_PHASES).flatMap(
  (group) => Object.values(group) as ScriptPhase[]
);

/** The script phases for a request type, in order (empty for types with no phases yet). */
export const getPhasesByRequestType = (requestType: RequestType): ScriptPhase[] =>
  SCRIPTING_PHASES.filter((phase) => phase.REQUEST_TYPE === requestType);
