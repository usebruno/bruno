import type { Scripts } from '@opencollection/types/common/scripts';
import type { FolderRequest as BrunoFolderRequest } from '@usebruno/schema-types/collection/folder';
import type { HttpRequest as BrunoHttpRequest } from '@usebruno/schema-types/requests/http';
import type { WebSocketRequest as BrunoWebSocketRequest } from '@usebruno/schema-types/requests/websocket';
import type { GrpcRequest as BrunoGrpcRequest } from '@usebruno/schema-types/requests/grpc';
import type { BrunoScript } from '../types';

export const toOpenCollectionScripts = (request: BrunoFolderRequest | BrunoHttpRequest | BrunoWebSocketRequest | BrunoGrpcRequest | null | undefined): Scripts | undefined => {
  const ocScripts: Scripts = [];
  const script = request?.script as BrunoScript | null | undefined;

  if (script?.req?.trim().length) {
    ocScripts.push({
      type: 'before-request',
      code: script.req.trim()
    });
  }
  if (script?.res?.trim().length) {
    ocScripts.push({
      type: 'after-response',
      code: script.res.trim()
    });
  }
  if (script?.beforeCallStart?.trim().length) {
    ocScripts.push({
      type: 'grpc:before-call-start',
      code: script.beforeCallStart.trim()
    });
  }
  if (script?.afterCallEnd?.trim().length) {
    ocScripts.push({
      type: 'grpc:after-call-end',
      code: script.afterCallEnd.trim()
    });
  }
  if (request?.tests?.trim().length) {
    ocScripts.push({
      type: 'tests',
      code: request.tests.trim()
    });
  }

  return ocScripts.length > 0 ? ocScripts : undefined;
};

export const fromOpenCollectionScripts = (scripts: Scripts | null | undefined, allowedKeys?: string[]): {
  script?: BrunoScript;
  tests?: string | null;
} | undefined => {
  if (!scripts || !Array.isArray(scripts) || scripts.length === 0) {
    return undefined;
  }

  const brunoScripts: {
    script?: BrunoScript;
    tests?: string | null;
  } = {};

  const setScript = (key: keyof BrunoScript, code: string) => {
    if (allowedKeys && !allowedKeys.includes(key)) {
      return;
    }
    if (!brunoScripts.script) {
      brunoScripts.script = {};
    }
    brunoScripts.script[key] = code;
  };

  for (const script of scripts) {
    if (!script.code) {
      continue;
    }

    switch (script.type) {
      case 'before-request':
        setScript('req', script.code);
        break;
      case 'after-response':
        setScript('res', script.code);
        break;
      case 'grpc:before-call-start':
        setScript('beforeCallStart', script.code);
        break;
      case 'grpc:after-call-end':
        setScript('afterCallEnd', script.code);
        break;
      case 'tests':
        brunoScripts.tests = script.code;
        break;
    }
  }

  return Object.keys(brunoScripts).length > 0 ? brunoScripts : undefined;
};
