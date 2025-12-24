import { uuid } from '../../common/index.js';
import {
  fromOpenCollectionAuth,
  toOpenCollectionAuth,
  fromOpenCollectionScripts,
  toOpenCollectionScripts,
  fromOpenCollectionVariables,
  toOpenCollectionVariables,
  fromOpenCollectionAssertions,
  toOpenCollectionAssertions
} from '../common';
import type {
  GrpcRequest,
  GrpcRequestInfo,
  GrpcRequestDetails,
  GrpcRequestRuntime,
  GrpcMetadata,
  GrpcMessageVariant,
  GrpcMessagePayload,
  Auth,
  BrunoItem,
  BrunoGrpcMessage,
  BrunoKeyValue
} from '../types';

const fromGrpcMetadata = (metadata: GrpcMetadata[] | undefined): BrunoKeyValue[] => {
  if (!metadata?.length) {
    return [];
  }

  return metadata.map((m): BrunoKeyValue => ({
    uid: uuid(),
    name: m.name || '',
    value: m.value || '',
    description: typeof m.description === 'string' ? m.description : (m.description as { content?: string } | undefined)?.content || null,
    enabled: m.disabled !== true
  }));
};

export const fromOpenCollectionGrpcItem = (item: GrpcRequest): BrunoItem => {
  const info = item.info || {};
  const grpc = item.grpc || {};
  const runtime = item.runtime || {};

  const grpcMessages: BrunoGrpcMessage[] = [];

  if (grpc.message) {
    if (typeof grpc.message === 'string') {
      grpcMessages.push({ name: 'message 1', content: grpc.message });
    } else if (Array.isArray(grpc.message)) {
      grpc.message.forEach((msg, index) => {
        grpcMessages.push({
          name: msg.title || `message ${index + 1}`,
          content: typeof msg.message === 'string' ? msg.message : ''
        });
      });
    }
  }

  const scripts = fromOpenCollectionScripts(runtime.scripts);

  const brunoItem: BrunoItem = {
    uid: uuid(),
    type: 'grpc-request',
    name: info.name || 'Untitled Request',
    seq: info.seq || 1,
    request: {
      url: grpc.url || '',
      method: grpc.method || '',
      headers: fromGrpcMetadata(grpc.metadata),
      body: {
        mode: 'grpc',
        grpc: grpcMessages
      },
      auth: fromOpenCollectionAuth(runtime.auth as Auth),
      script: scripts?.script,
      vars: fromOpenCollectionVariables(runtime.variables),
      assertions: fromOpenCollectionAssertions(runtime.assertions),
      tests: scripts?.tests,
      docs: ''
    }
  };

  // Add grpc-specific properties
  if (grpc.methodType) {
    (brunoItem.request as unknown as Record<string, unknown>).methodType = grpc.methodType;
  }
  if (grpc.protoFilePath) {
    (brunoItem.request as unknown as Record<string, unknown>).protoPath = grpc.protoFilePath;
  }

  if (info.tags?.length) {
    brunoItem.tags = info.tags;
  }

  return brunoItem;
};

export const toOpenCollectionGrpcItem = (item: BrunoItem): GrpcRequest => {
  const request = (item.request || {}) as Record<string, unknown>;

  const info: GrpcRequestInfo = {
    name: item.name || 'Untitled Request',
    type: 'grpc'
  };

  if (item.seq) {
    info.seq = item.seq;
  }

  if (item.tags?.length) {
    info.tags = item.tags;
  }

  const grpc: GrpcRequestDetails = {
    url: request.url as string || '',
    method: request.method as string || ''
  };

  if (request.methodType) {
    grpc.methodType = request.methodType as GrpcRequestDetails['methodType'];
  }
  if (request.protoPath) {
    grpc.protoFilePath = request.protoPath as string;
  }

  const headers = request.headers as BrunoKeyValue[] | undefined;
  if (headers?.length) {
    grpc.metadata = headers.map((h): GrpcMetadata => {
      const metadata: GrpcMetadata = {
        name: h.name || '',
        value: h.value || ''
      };

      if (h.description && typeof h.description === 'string' && h.description.trim().length) {
        metadata.description = h.description;
      }

      if (h.enabled === false) {
        metadata.disabled = true;
      }

      return metadata;
    });
  }

  const body = request.body as { grpc?: BrunoGrpcMessage[] } | undefined;
  if (body?.grpc?.length) {
    const messages = body.grpc;
    if (messages.length === 1) {
      grpc.message = messages[0].content || '';
    } else {
      grpc.message = messages.map((msg): GrpcMessageVariant => ({
        title: msg.name || 'Untitled',
        message: msg.content || ''
      }));
    }
  }

  const ocRequest: GrpcRequest = {
    info,
    grpc
  };

  const auth = toOpenCollectionAuth(request.auth as Parameters<typeof toOpenCollectionAuth>[0]);
  const scripts = toOpenCollectionScripts(request as Parameters<typeof toOpenCollectionScripts>[0]);
  const variables = toOpenCollectionVariables(request.vars as Parameters<typeof toOpenCollectionVariables>[0]);
  const assertions = toOpenCollectionAssertions(request.assertions as BrunoKeyValue[]);

  if (auth || scripts || variables || assertions) {
    const runtime: GrpcRequestRuntime = {};

    if (auth) {
      runtime.auth = auth;
    }

    if (scripts) {
      runtime.scripts = scripts;
    }

    if (variables) {
      runtime.variables = variables;
    }

    if (assertions) {
      runtime.assertions = assertions;
    }

    ocRequest.runtime = runtime;
  }

  if (request.docs) {
    ocRequest.docs = request.docs as string;
  }

  return ocRequest;
};
