import { uuid } from '../../common/index.js';
import {
  fromOpenCollectionHeaders,
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
  GrpcMetadata,
  GrpcMessageVariant,
  GrpcMessage,
  BrunoItem,
  BrunoGrpcMessage,
  BrunoKeyValue
} from '../types';

export const fromOpenCollectionGrpcItem = (item: GrpcRequest): BrunoItem => {
  const info = item.info || {};
  const grpc = item.grpc || {};
  const runtime = item.runtime || {};

  const grpcMessages: BrunoGrpcMessage[] = [];

  if (grpc.message) {
    if (typeof grpc.message === 'string') {
      grpcMessages.push({ name: 'message 1', content: grpc.message });
    } else if (Array.isArray(grpc.message)) {
      (grpc.message as GrpcMessageVariant[]).forEach((msg, index) => {
        grpcMessages.push({
          name: msg.title || `message ${index + 1}`,
          content: typeof msg.message === 'string' ? msg.message : '',
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
      headers: fromOpenCollectionHeaders(grpc.metadata as any),
      body: {
        mode: 'grpc',
        grpc: grpcMessages
      },
      auth: fromOpenCollectionAuth(runtime.auth),
      script: scripts.script,
      vars: fromOpenCollectionVariables(runtime.variables),
      assertions: fromOpenCollectionAssertions(runtime.assertions),
      tests: scripts.tests,
      docs: item.docs || ''
    }
  };

  // Add grpc-specific properties
  if (grpc.methodType) {
    (brunoItem.request as any).methodType = grpc.methodType;
  }
  if (grpc.protoFilePath) {
    (brunoItem.request as any).protoPath = grpc.protoFilePath;
  }

  if (info.tags?.length) {
    brunoItem.tags = info.tags;
  }

  return brunoItem;
};

export const toOpenCollectionGrpcItem = (item: BrunoItem): GrpcRequest => {
  const request = (item.request || {}) as any;

  const ocRequest: GrpcRequest = {
    info: {
      name: item.name || 'Untitled Request',
      type: 'grpc'
    },
    grpc: {
      url: request.url || '',
      method: request.method || ''
    }
  };

  if (item.seq) {
    ocRequest.info!.seq = item.seq;
  }

  if (item.tags?.length) {
    ocRequest.info!.tags = item.tags;
  }

  if (request.methodType) {
    ocRequest.grpc!.methodType = request.methodType;
  }

  if (request.protoPath) {
    ocRequest.grpc!.protoFilePath = request.protoPath;
  }

  if (request.headers?.length) {
    ocRequest.grpc!.metadata = (request.headers as BrunoKeyValue[]).map((m): GrpcMetadata => {
      const metadata: GrpcMetadata = {
        name: m.name || '',
        value: m.value || ''
      };

      if (m.description && typeof m.description === 'string' && m.description.trim().length) {
        metadata.description = m.description;
      }

      if (m.enabled === false) {
        metadata.disabled = true;
      }

      return metadata;
    });
  }

  if (request.body?.grpc?.length) {
    const messages = request.body.grpc as BrunoGrpcMessage[];
    if (messages.length === 1) {
      ocRequest.grpc!.message = messages[0].content || '';
    } else {
      ocRequest.grpc!.message = messages.map((msg): GrpcMessageVariant => ({
        title: msg.name || 'Untitled',
        message: msg.content || ''
      }));
    }
  }

  const auth = toOpenCollectionAuth(request.auth);
  const scripts = toOpenCollectionScripts(request);
  const variables = toOpenCollectionVariables(request.vars);
  const assertions = toOpenCollectionAssertions(request.assertions as BrunoKeyValue[]);

  if (auth || scripts || variables || assertions) {
    ocRequest.runtime = {};

    if (auth) {
      ocRequest.runtime.auth = auth;
    }

    if (scripts) {
      ocRequest.runtime.scripts = scripts;
    }

    if (variables) {
      ocRequest.runtime.variables = variables;
    }

    if (assertions) {
      ocRequest.runtime.assertions = assertions;
    }
  }

  if (request.docs) {
    ocRequest.docs = request.docs;
  }

  return ocRequest;
};
