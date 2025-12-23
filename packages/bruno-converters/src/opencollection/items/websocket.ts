import { uuid } from '../../common/index.js';
import {
  fromOpenCollectionHeaders,
  toOpenCollectionHeaders,
  fromOpenCollectionAuth,
  toOpenCollectionAuth,
  fromOpenCollectionScripts,
  toOpenCollectionScripts,
  fromOpenCollectionVariables,
  toOpenCollectionVariables
} from '../common';
import type {
  WebSocketRequest,
  WebSocketMessage,
  WebSocketMessageVariant,
  BrunoItem,
  BrunoWsMessage,
  BrunoKeyValue
} from '../types';

export const fromOpenCollectionWebsocketItem = (item: WebSocketRequest): BrunoItem => {
  const info = item.info || {};
  const websocket = item.websocket || {};
  const runtime = item.runtime || {};

  const wsMessages: BrunoWsMessage[] = [];

  if (websocket.message) {
    const msg = websocket.message as WebSocketMessage | WebSocketMessageVariant[];

    if ('type' in msg && 'data' in msg) {
      wsMessages.push({
        name: 'message 1',
        type: msg.type || 'json',
        content: msg.data || ''
      });
    } else if (Array.isArray(msg)) {
      msg.forEach((m, index) => {
        const wsMsg = m.message as WebSocketMessage;
        wsMessages.push({
          name: m.title || `message ${index + 1}`,
          type: wsMsg?.type || 'json',
          content: wsMsg?.data || ''
        });
      });
    }
  }

  const scripts = fromOpenCollectionScripts(runtime.scripts);

  const brunoItem: BrunoItem = {
    uid: uuid(),
    type: 'ws-request',
    name: info.name || 'Untitled Request',
    seq: info.seq || 1,
    request: {
      url: websocket.url || '',
      headers: fromOpenCollectionHeaders(websocket.headers),
      body: {
        mode: 'ws' as any,
        ws: wsMessages as any
      },
      auth: fromOpenCollectionAuth(runtime.auth),
      script: scripts.script,
      vars: fromOpenCollectionVariables(runtime.variables),
      tests: scripts.tests,
      docs: item.docs || ''
    }
  };

  if (info.tags?.length) {
    brunoItem.tags = info.tags;
  }

  return brunoItem;
};

export const toOpenCollectionWebsocketItem = (item: BrunoItem): WebSocketRequest => {
  const request = (item.request || {}) as any;

  const ocRequest: WebSocketRequest = {
    info: {
      name: item.name || 'Untitled Request',
      type: 'websocket'
    },
    websocket: {
      url: request.url || ''
    }
  };

  if (item.seq) {
    ocRequest.info!.seq = item.seq;
  }

  if (item.tags?.length) {
    ocRequest.info!.tags = item.tags;
  }

  const headers = toOpenCollectionHeaders(request.headers as BrunoKeyValue[]);
  if (headers) {
    ocRequest.websocket!.headers = headers;
  }

  if (request.body?.ws?.length) {
    const messages = request.body.ws as BrunoWsMessage[];
    if (messages.length === 1) {
      ocRequest.websocket!.message = {
        type: (messages[0].type as WebSocketMessage['type']) || 'json',
        data: messages[0].content || ''
      };
    } else {
      ocRequest.websocket!.message = messages.map((msg): WebSocketMessageVariant => ({
        title: msg.name || 'Untitled',
        message: {
          type: (msg.type as WebSocketMessage['type']) || 'json',
          data: msg.content || ''
        }
      }));
    }
  }

  const auth = toOpenCollectionAuth(request.auth);
  const scripts = toOpenCollectionScripts(request);
  const variables = toOpenCollectionVariables(request.vars);

  if (auth || scripts || variables) {
    ocRequest.runtime = {};

    if (auth) {
      ocRequest.runtime.auth = auth;
    }

    if (scripts) {
      ocRequest.runtime.scripts = scripts;
    }

    if (variables) {
      ocRequest.runtime.variables = variables;
    }
  }

  if (request.docs) {
    ocRequest.docs = request.docs;
  }

  return ocRequest;
};
