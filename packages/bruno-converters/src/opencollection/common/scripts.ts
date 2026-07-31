import type { Scripts, Script } from '@opencollection/types/common/scripts';
import type { FolderRequest as BrunoFolderRequest } from '@usebruno/schema-types/collection/folder';
import type { HttpRequest as BrunoHttpRequest } from '@usebruno/schema-types/requests/http';
import type { WebSocketRequest as BrunoWebSocketRequest } from '@usebruno/schema-types/requests/websocket';
import type { GrpcRequest as BrunoGrpcRequest } from '@usebruno/schema-types/requests/grpc';
import { getGrpcScriptingPhases } from '@usebruno/common';

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

export const fromOpenCollectionScripts = (scripts: Scripts | null | undefined): {
  script?: { req?: string | null; res?: string | null };
  tests?: string | null;
} | undefined => {
  if (!scripts || !Array.isArray(scripts) || scripts.length === 0) {
    return undefined;
  }

  const brunoScripts: {
    script?: { req?: string | null; res?: string | null };
    tests?: string | null;
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

/**
 * The gRPC counterparts of the two functions above. A gRPC call has four script phases instead of
 * HTTP's before-request/after-response pair, so the mapping between a Bruno `script.<field>` and an
 * OpenCollection script `type` comes from the phase registry (`grpc:before-call-start`, …) rather
 * than being written out. Tests are handled the same way in both.
 */
const GRPC_SCRIPT_PHASES = getGrpcScriptingPhases();

type BrunoGrpcScriptMap = Record<string, string | null | undefined>;

export const toOpenCollectionGrpcScripts = (request: BrunoGrpcRequest | null | undefined): Scripts | undefined => {
  const ocScripts: Scripts = [];

  for (const { FIELD, YML_TYPE } of GRPC_SCRIPT_PHASES) {
    const code = (request?.script as BrunoGrpcScriptMap | undefined)?.[FIELD];
    if (code?.trim().length) {
      ocScripts.push({
        type: YML_TYPE,
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

export const fromOpenCollectionGrpcScripts = (scripts: Scripts | null | undefined): {
  script?: BrunoGrpcScriptMap;
  tests?: string | null;
} | undefined => {
  if (!scripts || !Array.isArray(scripts) || scripts.length === 0) {
    return undefined;
  }

  const brunoScripts: {
    script?: BrunoGrpcScriptMap;
    tests?: string | null;
  } = {};

  for (const script of scripts) {
    if (!script.code) {
      continue;
    }

    const phase = GRPC_SCRIPT_PHASES.find(({ YML_TYPE }) => YML_TYPE === script.type);
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
