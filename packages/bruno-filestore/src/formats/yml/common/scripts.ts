import type { Scripts, Script } from '@opencollection/types/common/scripts';
import type { FolderRequest as BrunoFolderRequest } from '@usebruno/schema-types/collection/folder';
import type { HttpRequest as BrunoHttpRequest } from '@usebruno/schema-types/requests/http';
import type { WebSocketRequest as BrunoWebSocketRequest } from '@usebruno/schema-types/requests/websocket';
import type { GrpcRequest as BrunoGrpcRequest } from '@usebruno/schema-types/requests/grpc';

export const toOpenCollectionScripts = (request: BrunoFolderRequest | BrunoHttpRequest | BrunoWebSocketRequest | BrunoGrpcRequest | null | undefined): Scripts | undefined => {
  const ocScripts: Scripts = [];

  if (request?.script?.req?.trim().length) {
    ocScripts.push({
      type: 'before-request',
      code: request.script.req.trim()
    });
  }
  if (request?.script?.res?.trim().length) {
    ocScripts.push({
      type: 'after-response',
      code: request.script.res.trim()
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

export const toBrunoScripts = (scripts: Scripts | null | undefined): {
  script?: { req?: string; res?: string };
  tests?: string;
} | undefined => {
  if (!scripts || !Array.isArray(scripts) || scripts.length === 0) {
    return undefined;
  }

  const brunoScripts: {
    script?: { req?: string; res?: string };
    tests?: string;
  } = {};

  for (const script of scripts) {
    if (script.type === 'before-request' && script.code) {
      if (!brunoScripts.script) {
        brunoScripts.script = {};
      }
      brunoScripts.script.req = script.code;
    }
    if (script.type === 'after-response' && script.code) {
      if (!brunoScripts.script) {
        brunoScripts.script = {};
      }
      brunoScripts.script.res = script.code;
    }
    if (script.type === 'tests' && script.code) {
      brunoScripts.tests = script.code;
    }
  }

  return Object.keys(brunoScripts).length > 0 ? brunoScripts : undefined;
};
