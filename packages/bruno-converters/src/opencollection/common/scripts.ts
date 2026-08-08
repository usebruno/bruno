import type { Scripts, Script } from '@opencollection/types/common/scripts';
import type { FolderRequest as BrunoFolderRequest } from '@usebruno/schema-types/collection/folder';
import type { HttpRequest as BrunoHttpRequest } from '@usebruno/schema-types/requests/http';
import type { WebSocketRequest as BrunoWebSocketRequest } from '@usebruno/schema-types/requests/websocket';
import type { GrpcRequest as BrunoGrpcRequest } from '@usebruno/schema-types/requests/grpc';
import { getPhasesByRequestType, REQUEST_TYPES, type RequestType } from '@usebruno/common';

type BrunoScriptMap = Record<string, string | null | undefined>;

export const toOpenCollectionScripts = (
  request: BrunoFolderRequest | BrunoHttpRequest | BrunoWebSocketRequest | BrunoGrpcRequest | null | undefined,
  requestType: RequestType = REQUEST_TYPES.HTTP
): Scripts | undefined => {
  const ocScripts: Scripts = [];

  for (const phase of getPhasesByRequestType(requestType)) {
    const code = (request?.script as BrunoScriptMap | undefined)?.[phase.FIELD];
    if (code?.trim().length) {
      ocScripts.push({
        type: phase.YML_TYPE,
        code: code.trim()
      } as unknown as Script);
    }
  }
  if (request?.tests?.trim().length) {
    ocScripts.push({
      type: 'tests',
      code: request.tests.trim()
    });
  }

  return ocScripts.length > 0 ? ocScripts : undefined;
};

export const fromOpenCollectionScripts = (
  scripts: Scripts | null | undefined,
  requestType: RequestType = REQUEST_TYPES.HTTP
): {
  script?: BrunoScriptMap;
  tests?: string | null;
} | undefined => {
  if (!scripts || !Array.isArray(scripts) || scripts.length === 0) {
    return undefined;
  }

  const brunoScripts: {
    script?: BrunoScriptMap;
    tests?: string | null;
  } = {};

  const allPhases = getPhasesByRequestType(requestType);

  for (const script of scripts) {
    if (!script.code) {
      continue;
    }
    const phase = allPhases.find(({ YML_TYPE }) => YML_TYPE === script.type);
    if (phase) {
      brunoScripts.script = brunoScripts.script || {};
      brunoScripts.script[phase.FIELD] = script.code;
    }
    if (script.type === 'tests') {
      brunoScripts.tests = script.code;
    }
  }

  return Object.keys(brunoScripts).length > 0 ? brunoScripts : undefined;
};
