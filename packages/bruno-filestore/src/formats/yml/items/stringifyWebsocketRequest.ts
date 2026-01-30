import type { Item as BrunoItem } from '@usebruno/schema-types/collection/item';
import type { WebSocketRequest as BrunoWebSocketRequest } from '@usebruno/schema-types/requests/websocket';
import type { WebSocketRequest, WebSocketMessage, WebSocketRequestInfo, WebSocketRequestDetails, WebSocketRequestRuntime } from '@opencollection/types/requests/websocket';
import type { Auth } from '@opencollection/types/common/auth';
import type { Scripts } from '@opencollection/types/common/scripts';
import type { Variable } from '@opencollection/types/common/variables';
import type { HttpRequestHeader } from '@opencollection/types/requests/http';
import { stringifyYml } from '../utils';
import { isNonEmptyString } from '../../../utils';
import { toOpenCollectionAuth } from '../common/auth';
import { toOpenCollectionHttpHeaders } from '../common/headers';
import { toOpenCollectionVariables } from '../common/variables';
import { toOpenCollectionScripts } from '../common/scripts';

const stringifyWebsocketRequest = (item: BrunoItem): string => {
  try {
    const ocRequest: WebSocketRequest = {};
    const brunoRequest = item.request as BrunoWebSocketRequest;

    // info block
    const info: WebSocketRequestInfo = {
      name: isNonEmptyString(item.name) ? item.name : 'Untitled Request',
      type: 'websocket'
    };
    if (item.seq) {
      info.seq = item.seq;
    }
    if (item.tags?.length) {
      info.tags = item.tags;
    }
    ocRequest.info = info;

    // websocket block
    const websocket: WebSocketRequestDetails = {
      url: isNonEmptyString(brunoRequest.url) ? brunoRequest.url : ''
    };

    // headers
    const headers: HttpRequestHeader[] | undefined = toOpenCollectionHttpHeaders(brunoRequest.headers);
    if (headers) {
      websocket.headers = headers;
    }

    // message
    if (brunoRequest.body?.mode === 'ws' && brunoRequest.body.ws?.length) {
      const messages = brunoRequest.body.ws;

      // todo: bruno app supports only one message for now
      // update this when bruno app supports multiple messages
      if (messages.length) {
        const msg = messages[0];
        const message: WebSocketMessage = {
          type: (msg.type as 'text' | 'json' | 'xml' | 'binary') || 'text',
          data: msg.content || ''
        };
        if (message.data.trim().length) {
          websocket.message = message;
        }
      }
    }

    // auth
    const auth: Auth | undefined = toOpenCollectionAuth(brunoRequest.auth);
    if (auth) {
      websocket.auth = auth;
    }

    ocRequest.websocket = websocket;

    // runtime block
    const runtime: WebSocketRequestRuntime = {};
    let hasRuntime = false;

    // variables
    const variables: Variable[] | undefined = toOpenCollectionVariables(brunoRequest.vars);
    if (variables) {
      runtime.variables = variables;
      hasRuntime = true;
    }

    // scripts
    const scripts: Scripts | undefined = toOpenCollectionScripts(brunoRequest);
    if (scripts) {
      runtime.scripts = scripts;
      hasRuntime = true;
    }

    if (hasRuntime) {
      ocRequest.runtime = runtime;
    }

    // settings
    const wsSettings = item.settings as Record<string, number | string | undefined> | undefined;
    if (wsSettings) {
      ocRequest.settings = {};
      const timeout = Number(wsSettings.timeout);
      ocRequest.settings.timeout = !isNaN(timeout) ? timeout : 0;
      const keepAliveInterval = Number(wsSettings.keepAliveInterval);
      ocRequest.settings.keepAliveInterval = !isNaN(keepAliveInterval) ? keepAliveInterval : 0;
    }

    // docs
    if (isNonEmptyString(brunoRequest.docs)) {
      ocRequest.docs = brunoRequest.docs;
    }

    return stringifyYml(ocRequest);
  } catch (error) {
    console.error('Error stringifying WebSocket request:', error);
    throw error;
  }
};

export default stringifyWebsocketRequest;
