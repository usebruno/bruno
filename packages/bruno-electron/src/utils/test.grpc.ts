import {
  FileDescriptorSet as ProtobufEsFileDescriptorSet,
  MethodIdempotency,
  MethodKind,
  proto3,
} from '@bufbuild/protobuf';
import { Code, ConnectError, createPromiseClient } from '@connectrpc/connect';
import { createConnectTransport } from '@connectrpc/connect-node';
import {
  type Call,
  ChannelCredentials,
  type ClientDuplexStream,
  type ClientReadableStream,
  makeGenericClientConstructor,
  Metadata,
  type ServiceError,
  status,
  type StatusObject,
} from '@grpc/grpc-js';
import type {
  AnyDefinition,
  EnumTypeDefinition,
  MessageTypeDefinition,
  PackageDefinition,
  ServiceDefinition,
} from '@grpc/proto-loader';
import * as protoLoader from '@grpc/proto-loader';
import electron, { type IpcMainEvent } from 'electron';
import * as grpcReflection from 'grpc-reflection-js';

import { version } from '../../../package.json';
import * as models from '../../models';
import type { GrpcRequest, GrpcRequestBody, GrpcRequestHeader } from '../../models/grpc-request';
import { parseGrpcUrl } from '../../network/grpc/parse-grpc-url';
import { writeProtoFile } from '../../network/grpc/write-proto-file';
import { invariant } from '../../utils/invariant';
import { mockRequestMethods } from './automock';
import { ipcMainHandle, ipcMainOn } from './electron';

const grpcCalls = new Map<string, Call>();

export interface GrpcIpcRequestParams {
  request: GrpcRequest;
  clientCert?: string;
  clientKey?: string;
  caCertificate?: string;
  rejectUnauthorized: boolean;
}

export interface GrpcIpcMessageParams {
  requestId: string;
  body: GrpcRequestBody;
}

export interface gRPCBridgeAPI {
  start: (options: GrpcIpcRequestParams) => void;
  sendMessage: (options: GrpcIpcMessageParams) => void;
  commit: typeof commit;
  cancel: typeof cancel;
  loadMethods: typeof loadMethods;
  loadMethodsFromReflection: typeof loadMethodsFromReflection;
  closeAll: typeof closeAll;
}

export function registergRPCHandlers() {
  ipcMainOn('grpc.start', start);
  ipcMainOn('grpc.sendMessage', sendMessage);
  ipcMainOn('grpc.commit', (_, requestId) => commit(requestId));
  ipcMainOn('grpc.cancel', (_, requestId) => cancel(requestId));
  ipcMainOn('grpc.closeAll', closeAll);
  ipcMainHandle('grpc.loadMethods', (_, requestId) => loadMethods(requestId));
  ipcMainHandle('grpc.loadMethodsFromReflection', (_, requestId) => loadMethodsFromReflection(requestId));
}

const grpcOptions = {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
};
const loadMethodsFromFilePath = async (filePath: string, includeDirs: string[]): Promise<MethodDefs[]> => {
  try {
    const definition = await protoLoader.load(filePath, {
      ...grpcOptions,
      includeDirs,
    });
    return getMethodsFromPackageDefinition(definition);
  } catch (error) {
    console.error('Error loading methods from file path', error);
    throw error;
  }
};
const loadMethods = async (protoFileId: string): Promise<GrpcMethodInfo[]> => {
  const protoFile = await models.protoFile.getById(protoFileId);
  invariant(protoFile, `Proto file ${protoFileId} not found`);
  const { filePath, dirs } = await writeProtoFile(protoFile);
  const methods = await loadMethodsFromFilePath(filePath, dirs);
  return methods.map(method => ({
    type: getMethodType(method),
    fullPath: method.path,
  }));
};

interface MethodDefs {
  path: string;
  requestStream: boolean;
  responseStream: boolean;
  requestSerialize: (value: any) => Buffer;
  responseDeserialize: (value: Buffer) => any;
  example?: Record<string, any>;
}

const getMethodsFromReflectionServer = async (
  reflectionApi: GrpcRequest['reflectionApi']
): Promise<MethodDefs[]> => {
  const { url, module, apiKey } = reflectionApi;
  const GetFileDescriptorSetRequest = proto3.makeMessageType(
    'buf.reflect.v1beta1.GetFileDescriptorSetRequest',
    () => [
      { no: 1, name: 'module', kind: 'scalar', T: 9 /* ScalarType.STRING */ },
      { no: 2, name: 'version', kind: 'scalar', T: 9 /* ScalarType.STRING */ },
      {
        no: 3,
        name: 'symbols',
        kind: 'scalar',
        T: 9 /* ScalarType.STRING */,
        repeated: true,
      },
    ]
  );
  const GetFileDescriptorSetResponse = proto3.makeMessageType(
    'buf.reflect.v1beta1.GetFileDescriptorSetResponse',
    () => [
      {
        no: 1,
        name: 'file_descriptor_set',
        kind: 'message',
        T: ProtobufEsFileDescriptorSet,
      },
      { no: 2, name: 'version', kind: 'scalar', T: 9 /* ScalarType.STRING */ },
    ]
  );
  const FileDescriptorSetService = {
    typeName: 'buf.reflect.v1beta1.FileDescriptorSetService',
    methods: {
      getFileDescriptorSet: {
        name: 'GetFileDescriptorSet',
        I: GetFileDescriptorSetRequest,
        O: GetFileDescriptorSetResponse,
        kind: MethodKind.Unary,
        idempotency: MethodIdempotency.NoSideEffects,
      },
    },
  } as const;
  const transport = createConnectTransport({
    baseUrl: url,
    httpVersion: '1.1',
  });
  const client = createPromiseClient(FileDescriptorSetService, transport);
  const headers: HeadersInit = {
    'User-Agent': `insomnia/${version}`,
    ...(apiKey === '' ? {} : { Authorization: `Bearer ${apiKey}` }),
  };
  try {
    const res = await client.getFileDescriptorSet(
      {
        module,
      },
      {
        headers,
      }
    );
    const methodDefs: MethodDefs[] = [];
    if (res.fileDescriptorSet === undefined) {
      return [];
    }
    const packageDefinition = protoLoader.loadFileDescriptorSetFromBuffer(
      new Buffer(res.fileDescriptorSet.toBinary())
    );
    for (const definition of Object.values(packageDefinition)) {
      const serviceDefinition = asServiceDefinition(definition);
      if (serviceDefinition === null) {
        continue;
      }
      const serviceMethods = Object.values(serviceDefinition);
      methodDefs.push(...serviceMethods);
    }
    return methodDefs;
  } catch (error) {
    const connectError = ConnectError.from(error);
    switch (connectError.code) {
      case Code.Unauthenticated:
        throw new Error('Invalid reflection server api key');
      case Code.NotFound:
        throw new Error(
          "The reflection server api key doesn't have access to the module or the module does not exists"
        );
      default:
        throw error;
    }
  }
};
const getMethodsFromReflection = async (
  host: string,
  metadata: GrpcRequestHeader[],
  rejectUnauthorized: boolean,
  reflectionApi: GrpcRequest['reflectionApi'],
  clientCert?: string,
  clientKey?: string,
  caCertificate?: string,
): Promise<MethodDefs[]> => {
  if (reflectionApi.enabled) {
    return getMethodsFromReflectionServer(reflectionApi);
  }
  const { url, path } = parseGrpcUrl(host);
  const client = new grpcReflection.Client(
    url,
    getChannelCredentials({ url: host, caCertificate, clientCert, clientKey, rejectUnauthorized }),
    grpcOptions,
    filterDisabledOrInvalidMetaData(metadata),
    path
  );
  const services = await client.listServices();
  const methodsPromises = services.map(async service => {
    const fileContainingSymbol = await client.fileContainingSymbol(service);
    const fullService = fileContainingSymbol.lookupService(service);
    const mockedRequestMethods = (fullService);
    const descriptorMessage = fileContainingSymbol.toDescriptor('proto3');
    const packageDefinition = protoLoader.loadFileDescriptorSetFromObject(
      descriptorMessage,
      {}
    );
    const tryToGetMethods = () => {
      try {
        console.log('[grpc] loading service from reflection:', service);
        const serviceDefinition = asServiceDefinition(
          packageDefinition[service]
        );
        invariant(
          serviceDefinition,
          `'${service}' was not a valid ServiceDefinition`
        );
        const serviceMethods = Object.values(serviceDefinition);
        return serviceMethods.map(m => {
          const methodName = Object.keys(mockedRequestMethods).find(name =>
            m.path.endsWith(`/${name}`)
          );
          if (!methodName) {
            return m;
          }
          return {
            ...m,
            example: mockedRequestMethods[methodName]().plain,
          };
        });
      } catch (e) {
        console.error(e);
        return [];
      }
    };
    const methods = tryToGetMethods();
    return methods;
  });
  return (await Promise.all(methodsPromises)).flat();
};
export const loadMethodsFromReflection = async (options: {
  url: string;
  metadata: GrpcRequestHeader[];
  rejectUnauthorized: boolean;
  reflectionApi: GrpcRequest['reflectionApi'];
  clientCert?: string;
  clientKey?: string;
  caCertificate?: string;
}): Promise<GrpcMethodInfo[]> => {
  invariant(options.url, 'gRPC request url not provided');
  const methods = await getMethodsFromReflection(
    options.url,
    options.metadata,
    options.rejectUnauthorized,
    options.reflectionApi,
    options.clientCert,
    options.clientKey,
    options.caCertificate,
  );
  return methods.map(method => ({
    type: getMethodType(method),
    fullPath: method.path,
    example: method.example,
  }));
};

export interface GrpcMethodInfo {
  type: GrpcMethodType;
  fullPath: string;
  example?: Record<string, any>;
}

export const getMethodType = ({
  requestStream,
  responseStream,
}: any): GrpcMethodType => {
  if (requestStream && responseStream) {
    return 'bidi';
  }
  if (requestStream) {
    return 'client';
  }
  if (responseStream) {
    return 'server';
  }
  return 'unary';
};

export const getSelectedMethod = async (
  request: GrpcRequest,
  ipcParams: GrpcIpcRequestParams,
): Promise<MethodDefs | undefined> => {
  if (request.protoFileId) {
    const protoFile = await models.protoFile.getById(request.protoFileId);
    invariant(
      protoFile?.protoText,
      `No proto file found for gRPC request ${request._id}`
    );
    const { filePath, dirs } = await writeProtoFile(protoFile);
    const methods = await loadMethodsFromFilePath(filePath, dirs);
    invariant(methods, 'No methods found');
    return methods.find(c => c.path === request.protoMethodName);
  }
  const settings = await models.settings.getOrCreate();
  const methods = await getMethodsFromReflection(
    request.url,
    request.metadata,
    settings.validateSSL,
    request.reflectionApi,
    ipcParams.clientCert,
    ipcParams.clientKey,
    ipcParams.caCertificate,
  );
  invariant(methods, 'No reflection methods found');
  return methods.find(c => c.path === request.protoMethodName);
};
export const getMethodsFromPackageDefinition = (packageDefinition: PackageDefinition): MethodDefs[] => {
  return Object.values(packageDefinition)
    .filter(isServiceDefinition)
    .flatMap(Object.values);
};

const isServiceDefinition = (definition: AnyDefinition): definition is ServiceDefinition => {
  return !!asServiceDefinition(definition);
};
const asServiceDefinition = (definition: AnyDefinition): ServiceDefinition | null => {
  if (isMessageDefinition(definition) || isEnumDefinition(definition)) {
    return null;
  }
  return definition;
};
const isMessageDefinition = (definition: AnyDefinition): definition is MessageTypeDefinition => {
  return (definition as MessageTypeDefinition).format === 'Protocol Buffer 3 DescriptorProto';
};
const isEnumDefinition = (definition: AnyDefinition): definition is EnumTypeDefinition => {
  return (definition as EnumTypeDefinition).format === 'Protocol Buffer 3 EnumDescriptorProto';
};

const getChannelCredentials = ({ url, rejectUnauthorized, clientCert, clientKey, caCertificate }: { url: string; rejectUnauthorized: boolean; clientCert?: string; clientKey?: string; caCertificate?: string }): ChannelCredentials => {
  if (url.toLowerCase().startsWith('grpcs:')) {
    if (caCertificate && clientKey && clientCert) {
      return ChannelCredentials.createSsl(Buffer.from(caCertificate, 'utf8'), Buffer.from(clientKey, 'utf8'), Buffer.from(clientCert, 'utf8'), { rejectUnauthorized });
    }
    if (clientKey && clientCert) {
      return ChannelCredentials.createSsl(null, Buffer.from(clientKey, 'utf8'), Buffer.from(clientCert, 'utf8'), { rejectUnauthorized });
    }
    if (caCertificate) {
      return ChannelCredentials.createSsl(Buffer.from(caCertificate, 'utf8'), null, null, { rejectUnauthorized });
    }
    return ChannelCredentials.createSsl(null, null, null, { rejectUnauthorized });
  }
  return ChannelCredentials.createInsecure();
};

export const start = (
  event: IpcMainEvent,
  ipcParams: GrpcIpcRequestParams,
) => {
  const { request, rejectUnauthorized, clientCert, clientKey, caCertificate } = ipcParams;
  getSelectedMethod(request, ipcParams)?.then(method => {
    if (!method) {
      event.reply('grpc.error', request._id, new Error(`The gRPC method ${request.protoMethodName} could not be found`));
      return;
    }
    const methodType = getMethodType(method);
    // Create client
    const { url, path } = parseGrpcUrl(request.url);

    if (!url) {
      event.reply('grpc.error', request._id, new Error('URL not specified'));
      return undefined;
    }
    // @ts-expect-error -- TSCONVERSION second argument should be provided, send an empty string? Needs testing
    const Client = makeGenericClientConstructor({});
    const creds = getChannelCredentials({ url: request.url, rejectUnauthorized, clientCert, clientKey, caCertificate });
    const client = new Client(url, creds);
    if (!client) {
      return;
    }

    try {
      const messageBody = JSON.parse(request.body.text || '');
      const requestPath = path + method.path;
      switch (methodType) {
        case 'unary':
          const unaryCall = client.makeUnaryRequest(
            requestPath,
            method.requestSerialize,
            method.responseDeserialize,
            messageBody,
            filterDisabledOrInvalidMetaData(request.metadata),
            onUnaryResponse(event, request._id),
          );
          unaryCall.on('status', (status: StatusObject) => event.reply('grpc.status', request._id, status));
          grpcCalls.set(request._id, unaryCall);
          break;
        case 'client':
          const clientCall = client.makeClientStreamRequest(
            requestPath,
            method.requestSerialize,
            method.responseDeserialize,
            filterDisabledOrInvalidMetaData(request.metadata),
            onUnaryResponse(event, request._id));
          clientCall.on('status', (status: StatusObject) => event.reply('grpc.status', request._id, status));
          grpcCalls.set(request._id, clientCall);
          break;
        case 'server':
          const serverCall = client.makeServerStreamRequest(
            requestPath,
            method.requestSerialize,
            method.responseDeserialize,
            messageBody,
            filterDisabledOrInvalidMetaData(request.metadata),
          );
          onStreamingResponse(event, serverCall, request._id);
          grpcCalls.set(request._id, serverCall);
          break;
        case 'bidi':
          const bidiCall = client.makeBidiStreamRequest(
            requestPath,
            method.requestSerialize,
            method.responseDeserialize,
            filterDisabledOrInvalidMetaData(request.metadata));
          onStreamingResponse(event, bidiCall, request._id);
          grpcCalls.set(request._id, bidiCall);
          break;
        default:
          return;
      }
      // Update request stats
      models.stats.incrementExecutedRequests();
      event.reply('grpc.start', request._id);

    } catch (error) {
      // TODO: How do we want to handle this case, where the message cannot be parsed?
      //  Currently an error will be shown, but the stream will not be cancelled.
      event.reply('grpc.error', request._id, error);
    }
    return;
  }).catch(error => {
    event.reply('grpc.error', request._id, error);
  });
};

export const sendMessage = (
  event: IpcMainEvent,
  { body, requestId }: GrpcIpcMessageParams,
) => {
  try {
    const messageBody = JSON.parse(body.text || '');
    // HACK BUT DO NOT REMOVE
    // this must happen in the next tick otherwise the stream does not flush correctly
    // Try removing it and using a bidi RPC and notice messages don't send consistently
    process.nextTick(() => {
      // @ts-expect-error -- TSCONVERSION only write if the call is ClientWritableStream | ClientDuplexStream
      grpcCalls.get(requestId)?.write(messageBody, err => {
        if (err) {
          console.error('[gRPC] Error when writing to stream', err);
        }
      });
    });
  } catch (error) {
    event.reply('grpc.error', requestId, error);
  }
};

// @ts-expect-error -- TSCONVERSION only end if the call is ClientWritableStream | ClientDuplexStream
export const commit = (requestId: string): void => grpcCalls.get(requestId)?.end();
export const cancel = (requestId: string): void => grpcCalls.get(requestId)?.cancel();

const onStreamingResponse = (event: IpcMainEvent, call: ClientReadableStream<any> | ClientDuplexStream<any, any>, requestId: string) => {
  call.on('status', (status: StatusObject) => event.reply('grpc.status', requestId, status));
  call.on('data', data => event.reply('grpc.data', requestId, data));
  call.on('error', (error: ServiceError) => {
    if (error && error.code !== status.CANCELLED) {
      event.reply('grpc.error', requestId, error);
      // Taken through inspiration from other implementation, needs validation
      if (error.code === status.UNKNOWN || error.code === status.UNAVAILABLE) {
        event.reply('grpc.end', requestId);
        grpcCalls.delete(requestId);
      }
    }
  });
  call.on('end', () => {
    event.reply('grpc.end', requestId);
    // @ts-expect-error -- TSCONVERSION channel not found in call
    const channel = grpcCalls.get(requestId)?.call?.call.channel;
    if (channel) {
      channel.close();
    } else {
      console.log(`[gRPC] failed to close channel for req=${requestId} because it was not found`);
    }
    grpcCalls.delete(requestId);
  });
};

const onUnaryResponse = (event: IpcMainEvent, requestId: string) => (err: ServiceError | null, value?: Record<string, any>) => {
  if (!err) {
    event.reply('grpc.data', requestId, value);
  }
  if (err && err.code !== status.CANCELLED) {
    event.reply('grpc.error', requestId, err);
  }
  event.reply('grpc.end', requestId);
  // @ts-expect-error -- TSCONVERSION channel not found in call
  const channel = grpcCalls.get(requestId)?.call?.call.channel;
  if (channel) {
    channel.close();
  } else {
    console.log(`[gRPC] failed to close channel for req=${requestId} because it was not found`);
  }
  grpcCalls.delete(requestId);
};

const filterDisabledOrInvalidMetaData = (metadata: GrpcRequestHeader[]): Metadata => {
  const grpcMetadata = new Metadata();
  for (const entry of metadata) {
    if (!entry.disabled && entry.name) {
      grpcMetadata.add(entry.name, entry.value);
    }
  }
  return grpcMetadata;
};

export type GrpcMethodType = 'unary' | 'server' | 'client' | 'bidi';
const closeAll = (): void => grpcCalls.forEach(x => x.cancel());

if (typeof electron.app.on === 'function') {
  electron.app.on('window-all-closed', closeAll);
} else {
  console.warn('electron.app.on is not a function. Are you running a test?');
}

