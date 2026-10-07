import type { Script as OpenCollectionScript, Scripts } from '@opencollection/types/common/scripts';
import type { FolderRequest as BrunoFolderRequest } from '@usebruno/schema-types/collection/folder';
import type { HttpRequest as BrunoHttpRequest } from '@usebruno/schema-types/requests/http';
import type { WebSocketRequest as BrunoWebSocketRequest } from '@usebruno/schema-types/requests/websocket';
import type { GrpcRequest as BrunoGrpcRequest } from '@usebruno/schema-types/requests/grpc';
import type { Script as BrunoScript } from '@usebruno/schema-types/common/scripts';

export const toOpenCollectionScripts = (request: BrunoFolderRequest | BrunoHttpRequest | BrunoWebSocketRequest | BrunoGrpcRequest | null | undefined, allowedKeys: string[]): Scripts | undefined => {
  const ocScripts: Scripts = [];
  const script = request?.script as BrunoScript | null | undefined;

  const pushScript = (key: keyof BrunoScript, type: OpenCollectionScript['type'], code: string | null | undefined) => {
    if (!allowedKeys.includes(key)) {
      return;
    }
    if (!code?.trim().length) {
      return;
    }
    ocScripts.push({ type, code: code.trim() });
  };

  pushScript('req', 'before-request', script?.req);
  pushScript('res', 'after-response', script?.res);
  pushScript('beforeCallStart', 'grpc:before-call-start', script?.beforeCallStart);
  pushScript('beforeMessageSend', 'grpc:before-message-send', script?.beforeMessageSend);
  pushScript('afterMessageReceive', 'grpc:after-message-receive', script?.afterMessageReceive);
  pushScript('afterCallEnd', 'grpc:after-call-end', script?.afterCallEnd);

  if (request?.tests?.trim().length) {
    ocScripts.push({
      type: 'tests',
      code: request.tests.trim()
    });
  }

  return ocScripts.length > 0 ? ocScripts : undefined;
};

export const toBrunoScripts = (scripts: Scripts | null | undefined): {
  script?: BrunoScript;
  tests?: string;
} | undefined => {
  if (!scripts || !Array.isArray(scripts) || scripts.length === 0) {
    return undefined;
  }

  const brunoScripts: {
    script?: BrunoScript;
    tests?: string;
  } = {};

  const setScript = (key: keyof BrunoScript, code: string) => {
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
      case 'grpc:before-message-send':
        setScript('beforeMessageSend', script.code);
        break;
      case 'grpc:after-message-receive':
        setScript('afterMessageReceive', script.code);
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
