import { uuid } from '../../common/index.js';
import {
  fromOpenCollectionHeaders,
  toOpenCollectionHeaders,
  fromOpenCollectionAuth,
  toOpenCollectionAuth,
  fromOpenCollectionScripts,
  toOpenCollectionScripts,
  fromOpenCollectionVariables,
  toOpenCollectionVariables,
  fromOpenCollectionActions,
  toOpenCollectionActions
} from '../common';
import type {
  WebSocketRequest,
  WebSocketRequestInfo,
  WebSocketRequestDetails,
  WebSocketRequestRuntime,
  WebSocketMessage,
  WebSocketMessageVariant,
  Auth,
  BrunoItem,
  BrunoWsMessage,
  BrunoKeyValue,
  BrunoWebSocketRequestBody
} from '../types';

export const fromOpenCollectionWebsocketItem = (item: WebSocketRequest): BrunoItem => {
  const info = item.info || {};
  const websocket = item.websocket || {};
  const runtime = item.runtime || {};

  const wsMessages: BrunoWsMessage[] = [];

  if (websocket.message) {
    if ('type' in websocket.message && 'data' in websocket.message) {
      const msg = websocket.message as WebSocketMessage;
      wsMessages.push({
        name: 'message 1',
        type: msg.type || 'json',
        content: msg.data || ''
      });
    } else if (Array.isArray(websocket.message)) {
      websocket.message.forEach((m, index) => {
        wsMessages.push({
          name: m.title || `message ${index + 1}`,
          type: m.message?.type || 'json',
          content: m.message?.data || ''
        });
      });
    }
  }

  const scripts = fromOpenCollectionScripts(runtime.scripts);

  // variables (pre-request from variables, post-response from actions)
  const variables = fromOpenCollectionVariables(runtime.variables);
  const postResponseVars = fromOpenCollectionActions((runtime as { actions?: Parameters<typeof fromOpenCollectionActions>[0] }).actions);

  const wsBody: BrunoWebSocketRequestBody = {
    mode: 'ws',
    ws: wsMessages
  };

  const brunoItem: BrunoItem = {
    uid: uuid(),
    type: 'ws-request',
    name: info.name || 'Untitled Request',
    seq: info.seq || 1,
    request: {
      url: websocket.url || '',
      headers: fromOpenCollectionHeaders(websocket.headers),
      body: wsBody,
      auth: fromOpenCollectionAuth(runtime.auth as Auth),
      script: scripts?.script,
      vars: {
        req: variables.req,
        res: postResponseVars
      },
      tests: scripts?.tests,
      docs: item.docs || ''
    }
  };

  if (info.tags?.length) {
    brunoItem.tags = info.tags;
  }

  return brunoItem;
};

export const toOpenCollectionWebsocketItem = (item: BrunoItem): WebSocketRequest => {
  const request = (item.request || {}) as Record<string, unknown>;

  const info: WebSocketRequestInfo = {
    name: item.name || 'Untitled Request',
    type: 'websocket'
  };

  if (item.seq) {
    info.seq = item.seq;
  }

  if (item.tags?.length) {
    info.tags = item.tags;
  }

  const websocket: WebSocketRequestDetails = {
    url: request.url as string || ''
  };

  const headers = toOpenCollectionHeaders(request.headers as BrunoKeyValue[]);
  if (headers) {
    websocket.headers = headers;
  }

  const body = request.body as { ws?: BrunoWsMessage[] } | undefined;
  if (body?.ws?.length) {
    const messages = body.ws;
    if (messages.length === 1) {
      websocket.message = {
        type: (messages[0].type as WebSocketMessage['type']) || 'json',
        data: messages[0].content || ''
      };
    } else {
      websocket.message = messages.map((msg): WebSocketMessageVariant => ({
        title: msg.name || 'Untitled',
        message: {
          type: (msg.type as WebSocketMessage['type']) || 'json',
          data: msg.content || ''
        }
      }));
    }
  }

  const ocRequest: WebSocketRequest = {
    info,
    websocket
  };

  const auth = toOpenCollectionAuth(request.auth as Parameters<typeof toOpenCollectionAuth>[0]);
  const scripts = toOpenCollectionScripts(request as Parameters<typeof toOpenCollectionScripts>[0]);
  const variables = toOpenCollectionVariables(request.vars as Parameters<typeof toOpenCollectionVariables>[0]);

  // actions (from post-response variables)
  const vars = request.vars as { req?: unknown[]; res?: unknown[] } | undefined;
  const actions = toOpenCollectionActions(vars?.res as Parameters<typeof toOpenCollectionActions>[0]);

  if (auth || scripts || variables || actions) {
    const runtime: WebSocketRequestRuntime = {};

    if (auth) {
      runtime.auth = auth;
    }

    if (scripts) {
      runtime.scripts = scripts;
    }

    if (variables) {
      runtime.variables = variables;
    }

    if (actions) {
      (runtime as { actions?: typeof actions }).actions = actions;
    }

    ocRequest.runtime = runtime;
  }

  if (request.docs) {
    ocRequest.docs = request.docs as string;
  }

  return ocRequest;
};
