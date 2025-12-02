import type { Item as BrunoItem } from '@usebruno/schema-types/collection/item';
import type { WebSocketRequest as BrunoWebSocketRequest } from '@usebruno/schema-types/requests/websocket';
import type { WebSocketRequest, WebSocketMessage, WebSocketMessageVariant } from '@opencollection/types/requests/websocket';
import type { Auth } from '@opencollection/types/common/auth';
import type { Scripts } from '@opencollection/types/common/scripts';
import type { Variable } from '@opencollection/types/common/variables';
import type { HttpHeader } from '@opencollection/types/requests/http';
import { stringifyYml } from '../utils';
import { isNonEmptyString } from '../../../utils';
import { toOpenCollectionAuth } from '../common/auth';
import { toOpenCollectionHttpHeaders } from '../common/headers';
import { toOpenCollectionVariables } from '../common/variables';
import { toOpenCollectionScripts } from '../common/scripts';

interface WebSocketRequestWithSettings extends WebSocketRequest {
  settings?: {
    timeout?: number;
    keepAliveInterval?: number;
  };
}

const stringifyWebsocketRequest = (item: BrunoItem): string => {
  try {
    const ocRequest: WebSocketRequestWithSettings = {
      type: 'websocket'
    };

    ocRequest.name = isNonEmptyString(item.name) ? item.name : 'Untitled Request';

    // sequence
    if (item.seq) {
      ocRequest.seq = item.seq;
    }

    const brunoRequest = item.request as BrunoWebSocketRequest;
    // url
    ocRequest.url = isNonEmptyString(brunoRequest.url) ? brunoRequest.url : '';

    // headers
    const headers: HttpHeader[] | undefined = toOpenCollectionHttpHeaders(brunoRequest.headers);
    if (headers) {
      ocRequest.headers = headers;
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
          ocRequest.message = message;
        }
      }
    }

    // auth
    const auth: Auth | undefined = toOpenCollectionAuth(brunoRequest.auth);
    if (auth) {
      ocRequest.auth = auth;
    }

    // scripts
    const scripts: Scripts | undefined = toOpenCollectionScripts(brunoRequest);
    if (scripts) {
      ocRequest.scripts = scripts;
    }

    // variables
    const variables: Variable[] | undefined = toOpenCollectionVariables(brunoRequest.vars);
    if (variables) {
      ocRequest.variables = variables;
    }

    // docs
    if (isNonEmptyString(brunoRequest.docs)) {
      ocRequest.docs = brunoRequest.docs;
    }

    // tags
    if (item.tags?.length) {
      ocRequest.tags = item.tags;
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

    return stringifyYml(ocRequest);
  } catch (error) {
    console.error('Error stringifying WebSocket request:', error);
    throw error;
  }
};

export default stringifyWebsocketRequest;
