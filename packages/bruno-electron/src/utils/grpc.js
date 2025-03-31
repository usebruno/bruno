// import { proto3 } from '@bufbuild/protobuf';
const { 
  makeGenericClientConstructor, 
  ChannelCredentials, 
  Metadata,
  status
} = require('@grpc/grpc-js');
// const protoLoader = require('@grpc/proto-loader');
// import { Code, ConnectError, createPromiseClient } from '@connectrpc/connect';
// import { createConnectTransport } from '@connectrpc/connect-node';
const grpcReflection = require('grpc-reflection-js');
const protoLoader = require('@grpc/proto-loader');

const GRPC_OPTIONS = {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
};

const parseGrpcUrl = (url) => { // TODO: re-write as this is from insomina, do we even need this?
  if (!url) {
    return { host: '', enableTls: false, path: '' };
  }

  if (url.startsWith('unix:')) {
    return {
      host: url,
      enableTls: false,
      path: '',
    };
  }
  const urlObj = new URL((url.includes('://') ? '' : 'grpc://') + url.toLowerCase());
  return {
    host: urlObj.host,
    enableTls: urlObj.protocol === 'grpcs:',
    // remove trailing slashes from pathname; the full request
    // path is a concatenation of this parsed path + method path
    path: urlObj.pathname.endsWith('/') ? urlObj.pathname.slice(0, -1) : urlObj.pathname,
  };
};

const isMessageDefinition = (definition) => {
  return definition.format === 'Protocol Buffer 3 DescriptorProto';
};
const isEnumDefinition = (definition) => {
  return definition.format === 'Protocol Buffer 3 EnumDescriptorProto';
};

const isServiceDefinition = (definition) => {
  return !isMessageDefinition(definition) && !isEnumDefinition(definition);
};


class GrpcClient {
  constructor() {
    this.activeConnections = new Map();
  }

  /**
   * Get method type based on streaming configuration
   */
  getMethodType({ requestStream, responseStream }) {
    if (requestStream && responseStream) return 'BIDI-STREAMING';
    if (requestStream) return 'CLIENT-STREAMING';
    if (responseStream) return 'SERVER-STREAMING';
    return 'UNARY';
  }

  /**
   * @typedef {(hostname: string, cert: Object) => Error|undefined} CheckServerIdentityCallback
   * Callback for custom server certificate verification
   */

  /**
   * @typedef {Object} VerifyOptions
   * @property {CheckServerIdentityCallback} [checkServerIdentity] - If set, this callback will be
   * invoked after the usual hostname verification has been performed on the peer certificate.
   * @property {boolean} [rejectUnauthorized] - Whether to reject connections if the certificate validation fails
   */

  /**
   * Return a new ChannelCredentials instance with a given set of credentials.
   * The resulting instance can be used to construct a Channel that communicates
   * over TLS.
   * @param {string} url - The gRPC server URL
   * @param {string|null} rootCertificate - The root certificate data (CA certificate)
   * @param {string|null} privateKey - The client certificate private key, if available
   * @param {string|null} certificateChain - The client certificate key chain, if available
   * @param {VerifyOptions} verifyOptions - Additional options for verifying the server certificate
   * @returns {import('@grpc/grpc-js').ChannelCredentials} The gRPC channel credentials
   */
  getChannelCredentials({ url, rootCertificate, privateKey, certificateChain, verifyOptions }) {
    const isSecureConnection = url.includes('grpcs:');
    if (!isSecureConnection) {
      return ChannelCredentials.createInsecure();
    }
    const rootCertBuffer = rootCertificate ? Buffer.from(rootCertificate, 'utf-8') : null;
    const clientCertBuffer = certificateChain ? Buffer.from(certificateChain, 'utf-8') : null;
    const privateKeyBuffer = privateKey ? Buffer.from(privateKey, 'utf-8') : null;

    const credentials = ChannelCredentials.createSsl(rootCertBuffer, privateKeyBuffer, clientCertBuffer, verifyOptions);
    return credentials;
  }

  /**
   * Handle streaming responses
   */
  handleStreamingResponse(event, connection, requestId) { }

  /**
   * Handle unary responses
   */
  handleUnaryResponse(event, requestId) {}

  async start(event, { request, rejectUnauthorized, clientCert, clientKey, caCertificate }) {}
    
  sendMessage(event, { requestId, body }) {}

  /**
   * Load methods from server reflection
   */
  async loadMethodsFromReflection({ url, metadata, rootCertificate, privateKey, certificateChain, verifyOptions }) {
    const credentials = this.getChannelCredentials({ url, rootCertificate, privateKey, certificateChain, verifyOptions });
    const { host, path } = parseGrpcUrl(url);

    const client = new grpcReflection.Client(
        host,
        credentials,
        GRPC_OPTIONS,
        metadata,
        path
    )

    const declarations = await client.listServices();
    const methods = await Promise.all(declarations.map(async (declaration) => {
      const fileContainingSymbol = await client.fileContainingSymbol(declaration);
      const descriptorMessage = fileContainingSymbol.toDescriptor('proto3');
      const packageDefinition = protoLoader.loadFileDescriptorSetFromObject(
        descriptorMessage,
        {}
      );
      const serviceDefinition = packageDefinition[declaration] 
      if(!isServiceDefinition(serviceDefinition)) {
        return [];
      }
      const methods = Object.values(serviceDefinition);
      return methods
    }));

    const methodsWithType = methods.flat().map(method => ({
      ...method,
      type: this.getMethodType(method),
    }));
    console.log('methodsWithType from reflection', methodsWithType);
    return methodsWithType;
  }

  /**
   * Load methods from proto file
   */
  async loadMethodsFromProtoFile(filePath, includeDirs = []) {
    const definition = await protoLoader.load(filePath, {...GRPC_OPTIONS, includeDirs});
    const methods = Object.values(definition).filter(isServiceDefinition).flatMap(Object.values);
    const methodsWithType = methods.map(method => ({
      ...method,
      type: this.getMethodType(method),
    }));
    console.log('methodsWithType from protofile', methodsWithType);
    return methodsWithType;
  }
  
  /**
   * Load methods from buf reflection API
   */
  async loadMethodsFromBufReflection(reflectionApi) {}


  end(requestId) {
    const connection = this.activeConnections.get(requestId);
    if (connection && typeof connection.end === 'function') {
      connection.end();
    }
  }

  cancel(requestId) {
    const connection = this.activeConnections.get(requestId);
    if (connection && typeof connection.cancel === 'function') {
      connection.cancel();
    }
  }

  /**
   * Close all active connections
   */
  closeAll() {
    this.activeConnections.forEach(connection => {
      if (typeof connection.cancel === 'function') {
        connection.cancel();
      }
    });
    this.activeConnections.clear();
  }

  /**
   * Get buf reflection service definition
   */
  getBufReflectionService() {
    const GetFileDescriptorSetRequest = proto3.makeMessageType(
      'buf.reflect.v1beta1.GetFileDescriptorSetRequest',
      () => [
        { no: 1, name: 'module', kind: 'scalar', T: 9 },
        { no: 2, name: 'version', kind: 'scalar', T: 9 },
        { no: 3, name: 'symbols', kind: 'scalar', T: 9, repeated: true },
      ]
    );

    const GetFileDescriptorSetResponse = proto3.makeMessageType(
      'buf.reflect.v1beta1.GetFileDescriptorSetResponse',
      () => [
        { no: 1, name: 'file_descriptor_set', kind: 'message', T: FileDescriptorSet },
        { no: 2, name: 'version', kind: 'scalar', T: 9 },
      ]
    );

    return {
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
    };
  }
}

const grpcClient = new GrpcClient();
module.exports = grpcClient;

const electron = require('electron');
if (typeof electron.app.on === 'function') {
  electron.app.on('window-all-closed', () => grpcClient.closeAll());
} else {
  console.warn('electron.app.on is not a function. Are you running a test?');
}
