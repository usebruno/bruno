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
const { ipcMain, app } = require('electron');

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

/**
 * Handles gRPC events and forwards them to the renderer process
 * @param {Electron.IpcMainEvent} event - The IPC event
 * @param {string} requestId - The unique ID of the request
 * @param {Object} call - The gRPC call object
 */
const setupGrpcEventHandlers = (event, requestId, call) => {
  call.on('status', (status, res) => {
    console.log("Event", event);
    ipcMain.emit('grpc:status', requestId, { status, res });
    console.log(`grpc:status Request ${requestId} status`);
  });

  call.on('error', (error) => {
    ipcMain.emit('grpc:error', requestId, { error });
    console.log(`grpc:error Request ${requestId} error`);
  });

  call.on('end', (res) => {
    ipcMain.emit('grpc:end', requestId, { res });
    console.log(`grpc:end Request ${requestId} ended`);
    const channel = call?.call?.channel;
    if (channel) channel.close();
  });

  call.on('data', (res) => {
    ipcMain.emit('grpc:data', requestId, { res });
    console.log(`grpc:data Request ${requestId} received data`);
  });

  call.on('cancel', (res) => {
    ipcMain.emit('grpc:cancel', requestId, { res });
    console.log(`grpc:cancel Request ${requestId} cancelled`);
    
    const channel = call?.call?.channel;
    if (channel) channel.close();
  });

  call.on('metadata', (metadata) => {
    ipcMain.emit('grpc:metadata', requestId, { metadata });
    console.log(`grpc:metadata Request ${requestId} received metadata`);
  });
};



class GrpcClient {
  constructor() {
    this.activeConnections = new Map();
    this.methods = new Map();
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
  handleUnaryResponse(event, { client, requestId, requestPath, method, message, metadata }) {
    const call = client.makeUnaryRequest(requestPath, method.requestSerialize, method.responseDeserialize, message, metadata, (error, res) => {
      console.log("response error", error);
      console.log("response res", res);
      ipcMain.emit('grpc:response', requestId, { error, res });
    });
    
    setupGrpcEventHandlers(event, requestId, call);
  }

  /**
   * Get method from the path
   */
  getMethodFromPath(path) {
    if (this.methods.has(path)) {
      return this.methods.get(path);
    }
    throw new Error(`Method ${path} not found`);
  }

  handleClientStreamingResponse(event, { client, requestId, requestPath, method, message, metadata }) {
    const call = client.makeClientStreamRequest(requestPath, method.requestSerialize, method.responseDeserialize, message, metadata);
    this.activeConnections.set(requestId, call);

    setupGrpcEventHandlers(event, requestId, call);
  }

  handleServerStreamingResponse(event, { client, requestId, requestPath, method, message, metadata }) {
    const call = client.makeServerStreamRequest(requestPath, method.requestSerialize, method.responseDeserialize, message, metadata);
    this.activeConnections.set(requestId, call);
  
    setupGrpcEventHandlers(event, requestId, call);
  }

  handleBidiStreamingResponse(event, { client, requestId, requestPath, method, message, metadata }) {
    const call = client.makeBidiStreamRequest(requestPath, method.requestSerialize, method.responseDeserialize, message, metadata);
    this.activeConnections.set(requestId, call);
    

    setupGrpcEventHandlers(event, requestId, call);
  }

  /**
   * Handle connection
   * @param {Object} options - The options for the connection
   * @param {Object} options.client - The client instance
   * @param {string} options.requestId - The request ID
   * @param {string} options.requestPath - The request path
   * @param {Object} options.method - The method object
   * @param {Object} options.message - The message object
   * @param {Object} options.metadata - The metadata object
   */
  handleConnection(event, options) {
    console.log("handleConnection", options);
    const methodType = this.getMethodType(options.method);
    switch (methodType) {
      case 'UNARY':
        this.handleUnaryResponse(event, options);
        break;
      case 'CLIENT-STREAMING':
        this.handleClientStreamingResponse(event, options);
        break;
      case 'SERVER-STREAMING':
        this.handleServerStreamingResponse(event, options);
        break;
      case 'BIDI-STREAMING':
        this.handleBidiStreamingResponse(event, options);
        break;
      default:
        throw new Error(`Unsupported method type: ${methodType}`);
    }

  }

  async startConnection(event, { request, certificateChain, privateKey, rootCertificate, verifyOptions}) {
    const credentials = this.getChannelCredentials({ url: request.request.url, rootCertificate, privateKey, certificateChain, verifyOptions });

    console.log("received request", request);
    const { host, path } = parseGrpcUrl(request.request.url);
    const methodPath = request.request.method;
    const method = this.getMethodFromPath(methodPath);

    const Client = makeGenericClientConstructor({});
    const client = new Client(host, credentials);
    if (!client) {
      throw new Error('Failed to create client');
    }

    const message = JSON.parse(request.request.body.json);
    const requestPath = path + methodPath;
    const requestId = request.uid;
    const metadata = new Metadata();
    request.request.headers.forEach((header) => {
      metadata.add(header.name, header.value);
    });

    console.log("message", message);
    console.log("metadata", metadata.getMap());

    this.handleConnection(event, {
      client,
      requestId,
      requestPath,
      method,
      message,
      metadata,
    });
  }
    
  sendMessage(event, requestId, body) {
    const connection = this.activeConnections.get(requestId);
    if (connection) {
      connection.write(body, (error) => {
        if (error) {
          ipcMain.emit('grpc:error', requestId, { error });
        }
      });
    }
  }

  /**
   * Load methods from server reflection
   */
  async loadMethodsFromReflection(event, { url, metadata, rootCertificate, privateKey, certificateChain, verifyOptions }) {
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
      methods.forEach(method => {
        this.methods.set(method.path, method);
      });
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
  async loadMethodsFromProtoFile(event, filePath, includeDirs = []) {
    const definition = await protoLoader.load(filePath, {...GRPC_OPTIONS, includeDirs});
    const methods = Object.values(definition).filter(isServiceDefinition).flatMap(Object.values);
    const methodsWithType = methods.map(method => ({
      ...method,
      type: this.getMethodType(method),
    }));
    methods.forEach(method => {
      this.methods.set(method.path, method);
    });
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

if (typeof app.on === 'function') {
  app.on('window-all-closed', () => grpcClient.closeAll());
} else {
  console.warn('electron.app.on is not a function. Are you running a test?');
}
