import type { Item as BrunoItem } from '@usebruno/schema-types/collection/item';
import type { SignalRRequest as BrunoSignalRRequest } from '@usebruno/schema-types/requests/signalr';
import { toBrunoAuth } from '../common/auth';
import { toBrunoHttpHeaders } from '../common/headers';
import { toBrunoVariables } from '../common/variables';
import { toBrunoScripts } from '../common/scripts';
import { uuid, ensureString } from '../../../utils';

const parseSignalRRequest = (ocRequest: any): BrunoItem => {
  const info = ocRequest.info;
  const signalr = ocRequest.signalr;
  const runtime = ocRequest.runtime;

  const brunoRequest: BrunoSignalRRequest = {
    url: ensureString(signalr?.url),
    headers: toBrunoHttpHeaders(signalr?.headers) || [],
    auth: toBrunoAuth(signalr?.auth),
    body: {
      mode: 'signalr',
      signalr: []
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
  // messages
  if (signalr?.message) {
    if (Array.isArray(signalr.message)) {
      brunoRequest.body.signalr = (signalr.message as any[]).map((variant: any, index: number) => ({
        uid: uuid(),
        name: variant.title || variant.name || `message ${index + 1}`,
        type: variant.message?.type || variant.type || 'json',
        content: ensureString(variant.message?.data || variant.content || '[]'),
        selected: variant.selected || false
      }));
    } else {
      const msg = signalr.message;
      const messageData = ensureString(msg.data || msg.content || '');
      if (messageData.trim().length) {
        brunoRequest.body.signalr = [{
          uid: uuid(),
          name: msg.title || msg.name || 'message 1',
          type: msg.type || 'json',
          content: messageData,
          selected: true
        }];
      }
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
  const signalrSettings: Record<string, number> = {
    timeout: 0,
    keepAliveInterval: 0
  };

  if (ocRequest.settings) {
    if (typeof ocRequest.settings.timeout === 'number') {
      signalrSettings.timeout = ocRequest.settings.timeout;
    }
    if (typeof ocRequest.settings.keepAliveInterval === 'number') {
      signalrSettings.keepAliveInterval = ocRequest.settings.keepAliveInterval;
    }
  }

  // bruno item
  const brunoItem: BrunoItem = {
    uid: uuid(),
    type: 'signalr-request',
    seq: info?.seq || 1,
    name: ensureString(info?.name, 'Untitled Request'),
    tags: info?.tags || [],
    request: brunoRequest,
    settings: signalrSettings as any,
    fileContent: null,
    root: null,
    items: [],
    examples: [],
    filename: null,
    pathname: null
  };

  return brunoItem;
};

export default parseSignalRRequest;
