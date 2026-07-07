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
import type { Auth, BrunoItem, BrunoKeyValue } from '../types';
import type { SignalRRequest as BrunoSignalRRequest, SignalRInvocation, SignalRRequestBody } from '@usebruno/schema-types/requests/signalr';

export const fromOpenCollectionSignalrItem = (item: Record<string, any>): BrunoItem => {
  const info = item.info || {};
  const signalrBlock = item.signalr || {};
  const runtime = item.runtime || {};

  const signalrMessages: SignalRInvocation[] = [];

  if (signalrBlock.message) {
    if ('type' in signalrBlock.message && 'data' in signalrBlock.message) {
      const msg = signalrBlock.message;
      signalrMessages.push({
        name: msg.title || msg.name || 'message 1',
        type: msg.type || 'json',
        content: msg.data || '',
        selected: true
      });
    } else if (Array.isArray(signalrBlock.message)) {
      signalrBlock.message.forEach((m: Record<string, any>, index: number) => {
        signalrMessages.push({
          name: m.title || `message ${index + 1}`,
          type: m.message?.type || 'json',
          content: m.message?.data || '',
          selected: m.selected || false
        });
      });
    }
  }

  const scripts = fromOpenCollectionScripts(runtime.scripts);
  const variables = fromOpenCollectionVariables(runtime.variables);
  const postResponseVars = fromOpenCollectionActions(runtime.actions);

  const signalrBody: SignalRRequestBody = {
    mode: 'signalr',
    signalr: signalrMessages
  };

  const brunoItem: BrunoItem = {
    uid: uuid(),
    type: 'signalr-request',
    name: info.name || 'Untitled Request',
    seq: info.seq || 1,
    request: {
      url: signalrBlock.url || '',
      headers: fromOpenCollectionHeaders(signalrBlock.headers),
      body: signalrBody,
      auth: fromOpenCollectionAuth(signalrBlock.auth as Auth),
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

export const toOpenCollectionSignalrItem = (item: BrunoItem): Record<string, any> => {
  const request = (item.request || {}) as Record<string, any>;

  const info: Record<string, any> = {
    name: item.name || 'Untitled Request',
    type: 'signalr'
  };

  if (item.seq) {
    info.seq = item.seq;
  }

  if (item.tags?.length) {
    info.tags = item.tags;
  }

  const signalrBlock: Record<string, any> = {
    url: (request.url as string) || ''
  };

  const headers = toOpenCollectionHeaders(request.headers as BrunoKeyValue[]);
  if (headers) {
    signalrBlock.headers = headers;
  }

  const body = request.body as { signalr?: SignalRInvocation[] } | undefined;
  if (body?.signalr?.length) {
    const messages = body.signalr;
    if (messages.length === 1) {
      signalrBlock.message = {
        type: (messages[0].type as string) || 'json',
        data: (messages[0].content as string) || '[]',
        name: (messages[0].name as string) || ''
      };
    } else {
      signalrBlock.message = messages.map((msg) => ({
        title: msg.name || 'Untitled',
        ...(msg.selected ? { selected: true } : {}),
        message: {
          type: (msg.type as string) || 'json',
          data: (msg.content as string) || '[]'
        }
      }));
    }
  }

  const auth = toOpenCollectionAuth(request.auth as Parameters<typeof toOpenCollectionAuth>[0]);
  if (auth) {
    signalrBlock.auth = auth;
  }

  const ocRequest: Record<string, any> = {
    info,
    signalr: signalrBlock
  };

  const scripts = toOpenCollectionScripts(request as Parameters<typeof toOpenCollectionScripts>[0]);
  const variables = toOpenCollectionVariables(request.vars as Parameters<typeof toOpenCollectionVariables>[0]);

  const vars = request.vars as { req?: unknown[]; res?: unknown[] } | undefined;
  const actions = toOpenCollectionActions(vars?.res as Parameters<typeof toOpenCollectionActions>[0]);

  if (scripts || variables || actions) {
    const runtime: Record<string, any> = {};

    if (scripts) {
      runtime.scripts = scripts;
    }

    if (variables) {
      runtime.variables = variables;
    }

    if (actions) {
      runtime.actions = actions;
    }

    ocRequest.runtime = runtime;
  }

  if (request.docs) {
    ocRequest.docs = request.docs as string;
  }

  return ocRequest;
};
