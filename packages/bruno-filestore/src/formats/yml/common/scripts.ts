import type { Scripts } from '@opencollection/types/common/scripts';
import type { FolderRequest as BrunoFolderRequest } from '@usebruno/schema-types/collection/folder';
import type { HttpRequest as BrunoHttpRequest } from '@usebruno/schema-types/requests/http';
import type { WebSocketRequest as BrunoWebSocketRequest } from '@usebruno/schema-types/requests/websocket';
import type { GrpcRequest as BrunoGrpcRequest } from '@usebruno/schema-types/requests/grpc';
import type { Script as BrunoScript } from '@usebruno/schema-types/common/scripts';
import type { RequestType } from '@usebruno/common';

type ScriptField = keyof BrunoScript;
type BrunoScriptMap = Partial<Record<ScriptField, string | null>>;

/** A `Script` with a widened `type`: OpenCollection's ScriptType doesn't list the gRPC phases yet. */
type OcScriptEntry = { type: string; code: string };

export const toOpenCollectionScripts = (
  request: BrunoFolderRequest | BrunoHttpRequest | BrunoWebSocketRequest | BrunoGrpcRequest | null | undefined,
  requestType: RequestType = 'http-request'
): Scripts | undefined => {
  const ocScripts: OcScriptEntry[] = [];

  if (requestType === 'grpc-request') {
    const script = request?.script as BrunoScriptMap | undefined;

    if (script?.beforeCallStart?.trim().length) {
      ocScripts.push({
        type: 'grpc:before-call-start',
        code: script.beforeCallStart.trim()
      });
    }
    if (script?.beforeMessageSend?.trim().length) {
      ocScripts.push({
        type: 'grpc:before-message-send',
        code: script.beforeMessageSend.trim()
      });
    }
    if (script?.afterMessageReceive?.trim().length) {
      ocScripts.push({
        type: 'grpc:after-message-receive',
        code: script.afterMessageReceive.trim()
      });
    }
    if (script?.afterCallEnd?.trim().length) {
      ocScripts.push({
        type: 'grpc:after-call-end',
        code: script.afterCallEnd.trim()
      });
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

  return ocScripts.length > 0 ? (ocScripts as unknown as Scripts) : undefined;
};

export const toBrunoScripts = (
  scripts: Scripts | null | undefined,
  requestType: RequestType = 'http-request'
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

  if (requestType === 'grpc-request') {
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
