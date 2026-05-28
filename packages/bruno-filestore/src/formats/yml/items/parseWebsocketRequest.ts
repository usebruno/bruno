import type { Item as BrunoItem } from '@usebruno/schema-types/collection/item';
import type { WebSocketRequest as BrunoWebSocketRequest } from '@usebruno/schema-types/requests/websocket';
import type { WebSocketRequest, WebSocketMessage } from '@opencollection/types/requests/websocket';
import { toBrunoAuth } from '../common/auth';
import { toBrunoHttpHeaders } from '../common/headers';
import { toBrunoVariables } from '../common/variables';
import { toBrunoScripts } from '../common/scripts';
import { uuid, ensureString } from '../../../utils';

const parseWebsocketRequest = (ocRequest: WebSocketRequest): BrunoItem => {
  const info = ocRequest.info;
  const websocket = ocRequest.websocket;
  const runtime = ocRequest.runtime;

  const brunoRequest: BrunoWebSocketRequest = {
    url: ensureString(websocket?.url),
    headers: toBrunoHttpHeaders(websocket?.headers) || [],
    auth: toBrunoAuth(websocket?.auth),
    body: {
      mode: 'ws',
      ws: []
    },
    script: {
      req: null,
      res: null
    },
    vars: {
      req: [],
      res: []
    },
    assertions: [],
    tests: null,
    docs: null
  };

  // message
  if (websocket?.message) {
    const message = websocket.message as WebSocketMessage;
    const messageData = ensureString(message.data);
    if (messageData.trim().length) {
      brunoRequest.body.ws = [{
        name: '',
        type: message.type || 'text',
        content: messageData
      }];
    }
  }

  // scripts
  const scripts = toBrunoScripts(runtime?.scripts);
  if (scripts?.script && brunoRequest.script) {
    if (scripts.script.req) {
      brunoRequest.script.req = scripts.script.req;
    }
    if (scripts.script.res) {
      brunoRequest.script.res = scripts.script.res;
    }
  }
  if (scripts?.tests) {
    brunoRequest.tests = scripts.tests;
  }

  // variables
  const variables = toBrunoVariables(runtime?.variables);
  brunoRequest.vars = variables;

  // docs
  if (ocRequest.docs) {
    brunoRequest.docs = ocRequest.docs;
  }

  // settings
  const wsSettings: Record<string, number> = {
    timeout: 0,
    keepAliveInterval: 0
  };

  if (ocRequest.settings) {
    if (typeof ocRequest.settings.timeout === 'number') {
      wsSettings.timeout = ocRequest.settings.timeout;
    }
    if (typeof ocRequest.settings.keepAliveInterval === 'number') {
      wsSettings.keepAliveInterval = ocRequest.settings.keepAliveInterval;
    }
  }

  // bruno item
  const brunoItem: BrunoItem = {
    uid: uuid(),
    type: 'ws-request',
    seq: info?.seq || 1,
    name: ensureString(info?.name, 'Untitled Request'),
    tags: info?.tags || [],
    request: brunoRequest,
    settings: wsSettings as any,
    fileContent: null,
    root: null,
    items: [],
    examples: [],
    filename: null,
    pathname: null
  };

  return brunoItem;
};

export default parseWebsocketRequest;
