import type { Item as BrunoItem } from '@usebruno/schema-types/collection/item';
import type { SignalRRequest as BrunoSignalRRequest } from '@usebruno/schema-types/requests/signalr';
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

const stringifySignalRRequest = (item: BrunoItem): string => {
  try {
    const brunoRequest = item.request as BrunoSignalRRequest;

    const ocRequest: Record<string, any> = {
      info: {
        name: isNonEmptyString(item.name) ? item.name : 'Untitled Request',
        type: 'signalr'
      }
    };
    if (item.seq) {
      ocRequest.info.seq = item.seq;
    }
    if (item.tags?.length) {
      ocRequest.info.tags = item.tags;
    }

    const signalrBlock: Record<string, any> = {
      url: isNonEmptyString(brunoRequest.url) ? brunoRequest.url : ''
    };

    const headers: HttpRequestHeader[] | undefined = toOpenCollectionHttpHeaders(brunoRequest.headers);
    if (headers) {
      signalrBlock.headers = headers;
    }

    if (brunoRequest.body?.mode === 'signalr' && brunoRequest.body.signalr?.length) {
      const messages = brunoRequest.body.signalr;
      if (messages.length === 1) {
        const msg = messages[0];
        signalrBlock.message = {
          type: msg.type || 'json',
          data: msg.content || '[]',
          name: msg.name || ''
        };
      } else {
        signalrBlock.message = messages.map((msg, index) => ({
          title: msg.name || `message ${index + 1}`,
          selected: msg.selected || false,
          message: {
            type: msg.type || 'json',
            data: msg.content || '[]'
          }
        }));
      }
    }

    const auth: Auth | undefined = toOpenCollectionAuth(brunoRequest.auth);
    if (auth) {
      signalrBlock.auth = auth;
    }

    ocRequest.signalr = signalrBlock;

    const runtime: Record<string, any> = {};
    let hasRuntime = false;

    const variables: Variable[] | undefined = toOpenCollectionVariables(brunoRequest.vars);
    if (variables) {
      runtime.variables = variables;
      hasRuntime = true;
    }

    const scripts: Scripts | undefined = toOpenCollectionScripts(brunoRequest);
    if (scripts) {
      runtime.scripts = scripts;
      hasRuntime = true;
    }

    if (hasRuntime) {
      ocRequest.runtime = runtime;
    }

    const signalrSettings = item.settings as Record<string, number | string | undefined> | undefined;
    if (signalrSettings) {
      const settings: Record<string, number> = {};

      if (signalrSettings.timeout != null) {
        const timeout = Number(signalrSettings.timeout);
        if (!Number.isNaN(timeout)) {
          settings.timeout = timeout;
        }
      }

      if (signalrSettings.keepAliveInterval != null) {
        const keepAliveInterval = Number(signalrSettings.keepAliveInterval);
        if (!Number.isNaN(keepAliveInterval)) {
          settings.keepAliveInterval = keepAliveInterval;
        }
      }

      if (Object.keys(settings).length) {
        ocRequest.settings = settings;
      }
    }

    if (isNonEmptyString(brunoRequest.docs)) {
      ocRequest.docs = brunoRequest.docs;
    }

    return stringifyYml(ocRequest);
  } catch (error) {
    console.error('Error stringifying SignalR request:', error);
    throw error;
  }
};

export default stringifySignalRRequest;
