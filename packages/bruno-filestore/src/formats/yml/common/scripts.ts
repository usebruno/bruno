import type { Scripts, Script } from '@opencollection/types/common/scripts';
import type { FolderRequest as BrunoFolderRequest } from '@usebruno/schema-types/collection/folder';
import type { HttpRequest as BrunoHttpRequest } from '@usebruno/schema-types/requests/http';
import type { WebSocketRequest as BrunoWebSocketRequest } from '@usebruno/schema-types/requests/websocket';
import type { GrpcRequest as BrunoGrpcRequest } from '@usebruno/schema-types/requests/grpc';
import type { Script as BrunoScript } from '@usebruno/schema-types/common/scripts';
import { getGrpcScriptingPhases, REQUEST_TYPES, type RequestType } from '@usebruno/common';

type ScriptField = keyof BrunoScript;
type BrunoScriptMap = Partial<Record<ScriptField, string | null>>;

export const toOpenCollectionScripts = (
  request: BrunoFolderRequest | BrunoHttpRequest | BrunoWebSocketRequest | BrunoGrpcRequest | null | undefined,
  requestType: RequestType = REQUEST_TYPES.HTTP
): Scripts | undefined => {
  const ocScripts: Scripts = [];

  if (requestType === REQUEST_TYPES.GRPC) {
    const script = request?.script as BrunoScriptMap | undefined;
    for (const { FIELD, YML_TYPE } of getGrpcScriptingPhases()) {
      const code = script?.[FIELD as ScriptField];
      if (code?.trim().length) {
        ocScripts.push({ type: YML_TYPE, code: code.trim() } as unknown as Script);
      }
    }
  } else {
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

  if (requestType === REQUEST_TYPES.GRPC) {
    for (const script of scripts) {
      // OpenCollection's ScriptType doesn't carry the gRPC phase types yet, hence the widening.
      const type = script.type as string;

      if (type === 'grpc:before-call-start' && script.code) {
        if (!brunoScripts.script) {
          brunoScripts.script = {};
        }
        brunoScripts.script.beforeCallStart = script.code;
      }
      if (type === 'grpc:before-message-send' && script.code) {
        if (!brunoScripts.script) {
          brunoScripts.script = {};
        }
        brunoScripts.script.beforeMessageSend = script.code;
      }
      if (type === 'grpc:after-message-receive' && script.code) {
        if (!brunoScripts.script) {
          brunoScripts.script = {};
        }
        brunoScripts.script.afterMessageReceive = script.code;
      }
      if (type === 'grpc:after-call-end' && script.code) {
        if (!brunoScripts.script) {
          brunoScripts.script = {};
        }
        brunoScripts.script.afterCallEnd = script.code;
      }
      if (type === 'tests' && script.code) {
        brunoScripts.tests = script.code;
      }
    }

    return Object.keys(brunoScripts).length > 0 ? brunoScripts : undefined;
  }

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
