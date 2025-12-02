import type { Item as BrunoItem } from '@usebruno/schema-types/collection/item';
import type { WebSocketRequest as BrunoWebSocketRequest } from '@usebruno/schema-types/requests/websocket';
import type { WebSocketRequest, WebSocketMessage } from '@opencollection/types/requests/websocket';
import { toBrunoAuth } from '../common/auth';
import { toBrunoHttpHeaders } from '../common/headers';
import { toBrunoVariables } from '../common/variables';
import { toBrunoScripts } from '../common/scripts';
import { uuid } from '../../../utils';

interface WebSocketRequestWithSettings extends WebSocketRequest {
  settings?: {
    timeout?: number;
    keepAliveInterval?: number;
  };
}

const parseWebsocketRequest = (ocRequest: WebSocketRequestWithSettings): BrunoItem => {
  const brunoRequest: BrunoWebSocketRequest = {
    url: ocRequest.url || '',
    headers: toBrunoHttpHeaders(ocRequest.headers) || [],
    auth: toBrunoAuth(ocRequest.auth),
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
  if (ocRequest.message) {
    const message = ocRequest.message as WebSocketMessage;
    if (message.data?.trim().length) {
      brunoRequest.body.ws = [{
        name: '',
        type: message.type || 'text',
        content: message.data
      }];
    }
  }

  // scripts
  const scripts = toBrunoScripts(ocRequest.scripts);
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
  const variables = toBrunoVariables(ocRequest.variables);
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
    seq: ocRequest.seq || 1,
    name: ocRequest.name || 'Untitled Request',
    tags: ocRequest.tags || [],
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
