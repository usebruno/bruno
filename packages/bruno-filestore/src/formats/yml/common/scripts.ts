import { Scripts } from '@opencollection/types/common/scripts';
import { FolderRequest as BrunoFolderRequest } from '@usebruno/schema-types/collection/folder';
import { HttpRequest as BrunoHttpRequest } from '@usebruno/schema-types/requests/http';
import { WebSocketRequest as BrunoWebSocketRequest } from '@usebruno/schema-types/requests/websocket';
import { GrpcRequest as BrunoGrpcRequest } from '@usebruno/schema-types/requests/grpc';

export const toOpenCollectionScripts = (request: BrunoFolderRequest | BrunoHttpRequest | BrunoWebSocketRequest | BrunoGrpcRequest | null | undefined): Scripts | undefined => {
  const ocScripts: Scripts = {};

  if (request?.script?.req?.trim().length) {
    ocScripts.preRequest = request.script.req.trim();
  }
  if (request?.script?.res?.trim().length) {
    ocScripts.postResponse = request.script.res.trim();
  }
  if (request?.script?.hooks?.trim().length) {
    ocScripts.hooks = request.script.hooks.trim();
  }
  if (request?.tests?.trim().length) {
    ocScripts.tests = request.tests.trim();
  }

  return Object.keys(ocScripts).length > 0 ? ocScripts : undefined;
};

export const toBrunoScripts = (scripts: Scripts | null | undefined): {
  script?: { req?: string; res?: string; hooks?: string };
  tests?: string;
} | undefined => {
  if (!scripts) {
    return undefined;
  }

  const brunoScripts: {
    script?: { req?: string; res?: string; hooks?: string };
    tests?: string;
  } = {};

  if (scripts.preRequest || scripts.postResponse || scripts.hooks) {
    brunoScripts.script = {};
    if (scripts.preRequest) {
      brunoScripts.script.req = scripts.preRequest;
    }
    if (scripts.postResponse) {
      brunoScripts.script.res = scripts.postResponse;
    }
    if (scripts.hooks) {
      brunoScripts.script.hooks = scripts.hooks;
    }
  }

  if (scripts.tests) {
    brunoScripts.tests = scripts.tests;
  }

  return Object.keys(brunoScripts).length > 0 ? brunoScripts : undefined;
};
