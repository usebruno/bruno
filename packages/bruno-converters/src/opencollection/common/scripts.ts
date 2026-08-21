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
 * The gRPC counterparts of the two functions above: a gRPC call has one script per call phase
 * instead of HTTP's before-request/after-response pair. Tests are handled the same way in both.
 */
type BrunoGrpcScriptMap = Record<string, string | null | undefined>;

export const toOpenCollectionGrpcScripts = (request: BrunoGrpcRequest | null | undefined): Scripts | undefined => {
  const ocScripts: Scripts = [];
  const script = request?.script as BrunoGrpcScriptMap | undefined;

  if (script?.beforeCallStart?.trim().length) {
    ocScripts.push({ type: 'grpc:before-call-start', code: script.beforeCallStart.trim() } as unknown as Script);
  }
  if (script?.beforeMessageSend?.trim().length) {
    ocScripts.push({ type: 'grpc:before-message-send', code: script.beforeMessageSend.trim() } as unknown as Script);
  }
  if (script?.afterMessageReceive?.trim().length) {
    ocScripts.push({ type: 'grpc:after-message-receive', code: script.afterMessageReceive.trim() } as unknown as Script);
  }
  if (script?.afterCallEnd?.trim().length) {
    ocScripts.push({ type: 'grpc:after-call-end', code: script.afterCallEnd.trim() } as unknown as Script);
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

    // OpenCollection's ScriptType doesn't carry the gRPC phase types yet, hence the widening.
    const type = script.type as string;

    if (type === 'grpc:before-call-start') {
      brunoScripts.script = brunoScripts.script || {};
      brunoScripts.script.beforeCallStart = script.code;
    }
    if (type === 'grpc:before-message-send') {
      brunoScripts.script = brunoScripts.script || {};
      brunoScripts.script.beforeMessageSend = script.code;
    }
    if (type === 'grpc:after-message-receive') {
      brunoScripts.script = brunoScripts.script || {};
      brunoScripts.script.afterMessageReceive = script.code;
    }
    if (type === 'grpc:after-call-end') {
      brunoScripts.script = brunoScripts.script || {};
      brunoScripts.script.afterCallEnd = script.code;
    }
    if (type === 'tests') {
      brunoScripts.tests = script.code;
    }
  }

  return Object.keys(brunoScripts).length > 0 ? brunoScripts : undefined;
};
