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

  const script = request?.script as BrunoScriptMap | undefined;
  for (const phase of getPhasesByRequestType(requestType)) {
    const code = script?.[phase.FIELD];
    if (code?.trim().length) {
      ocScripts.push({ type: phase.YML_TYPE, code: code.trim() } as unknown as Script);
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

export const toBrunoScripts = (
  scripts: Scripts | null | undefined,
  requestType: RequestType = REQUEST_TYPES.HTTP
): {
  script?: BrunoScriptMap;
  tests?: string;
} | undefined => {
  if (!scripts || !Array.isArray(scripts) || scripts.length === 0) {
    return undefined;
  }

  const brunoScripts: {
    script?: BrunoScriptMap;
    tests?: string;
  } = {};

  const phases = getPhasesByRequestType(requestType);

  for (const script of scripts) {
    if (!script.code) {
      continue;
    }
    const phase = phases.find((phase) => phase.YML_TYPE === script.type);
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

/** Copy parsed script fields onto a request/folder/collection object (tests handled by the caller). */
export const applyBrunoScripts = <T extends { script?: any }>(
  brunoRequest: T | null | undefined,
  scripts: ReturnType<typeof toBrunoScripts>,
  // Defaults to HTTP: only gRPC has its own phases; graphql, websocket, folder and collection
  // all share the HTTP script shape (req/res).
  requestType: RequestType = REQUEST_TYPES.HTTP
): void => {
  if (!brunoRequest) {
    return;
  }
  const sourceScript = scripts?.script as BrunoScriptMap | undefined;
  const targetScript = brunoRequest.script as BrunoScriptMap | undefined | null;
  if (sourceScript && targetScript) {
    for (const { FIELD } of getPhasesByRequestType(requestType)) {
      if (sourceScript[FIELD] != null) {
        targetScript[FIELD] = sourceScript[FIELD];
      }
    }
  }
};
