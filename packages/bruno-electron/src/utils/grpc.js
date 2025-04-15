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
const grpcMessageGenerator = require('./grpcMessageGenerator');

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
 * @param {string} requestId - The unique ID of the request
 * @param {Object} call - The gRPC call object
 */
const setupGrpcEventHandlers = (window, requestId, collectionUid, call) => {
  
  call.on('status', (status, res) => {
    window.webContents.send('grpc:status', requestId, collectionUid, { status, res });
    console.log(`grpc:status Request ${requestId} status ${JSON.stringify(status)} res ${JSON.stringify(res)}`);

  });

  call.on('error', (error) => {
    window.webContents.send('grpc:error', requestId, collectionUid, { error });
    console.log(`grpc:error Request ${requestId} ${error}`);
  });

  call.on('end', (res) => {
    window.webContents.send('grpc:server-end-stream', requestId, collectionUid, { res });
    console.log(`grpc:end Request ${requestId} ended ${JSON.stringify(res)}`);
    const channel = call?.call?.channel;
    if (channel) channel.close();
  });

  call.on('data', (res) => {
    window.webContents.send('grpc:response', requestId, collectionUid, { error: null, res });
    console.log(`grpc:response Request ${requestId} received data ${JSON.stringify(res)}`);
  });

  call.on('cancel', (res) => {
    window.webContents.send('grpc:server-cancel-stream', requestId, collectionUid, { res });
    console.log(`grpc:cancel Request ${requestId} cancelled ${JSON.stringify(res)}`);
    
    const channel = call?.call?.channel;
    if (channel) channel.close();
  });

  call.on('metadata', (metadata) => {
    window.webContents.send('grpc:metadata', requestId, collectionUid, { metadata });
    console.log(`grpc:metadata Request ${requestId} received metadata ${JSON.stringify(metadata)}`);
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
   * Handle unary responses
   */
  handleUnaryResponse({ client, requestId, requestPath, method, messages, metadata, collectionUid, window }) {
    const call = client.makeUnaryRequest(requestPath, method.requestSerialize, method.responseDeserialize, messages[0], metadata, (error, res) => {
      window.webContents.send('grpc:response', requestId, collectionUid, { error, res });
    });
    
    setupGrpcEventHandlers(window, requestId, collectionUid, call);
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

  handleClientStreamingResponse({ client, requestId, requestPath, method, metadata, collectionUid, window }) {
    const call = client.makeClientStreamRequest(requestPath, method.requestSerialize, method.responseDeserialize, metadata, (error, res) => {
      console.log("response error", error);
      console.log("response res", res);
      window.webContents.send('grpc:response', requestId, collectionUid, { error, res });
    });
    this.activeConnections.set(requestId, call);

    setupGrpcEventHandlers(window, requestId, collectionUid, call);
  }

  handleServerStreamingResponse({ client, requestId, requestPath, method, messages, metadata, collectionUid, window }) {
    console.log("messages from handleServerStreamingResponse", messages);
    const message = messages[0];
    const call = client.makeServerStreamRequest(requestPath, method.requestSerialize, method.responseDeserialize, message, metadata, (error, res) => {
      window.webContents.send('grpc:response', requestId, collectionUid, { error, res });
    });
    this.activeConnections.set(requestId, call);
  
    setupGrpcEventHandlers(window, requestId, collectionUid, call);
  }

  handleBidiStreamingResponse({ client, requestId, requestPath, method, messages, metadata, collectionUid, window }) {
    const call = client.makeBidiStreamRequest(requestPath, method.requestSerialize, method.responseDeserialize, metadata);
    this.activeConnections.set(requestId, call);
    
    console.log("call from handleBidiStreamingResponse", call);
    setupGrpcEventHandlers(window, requestId, collectionUid, call);
  }

  /**
   * Handle connection
   * @param {Object} options - The options for the connection
   * @param {Object} options.client - The client instance
   * @param {string} options.requestId - The request ID
   * @param {string} options.collectionUid - The collection UID
   * @param {string} options.requestPath - The request path
   * @param {Object} options.method - The method object
   * @param {Object} options.messages - The messages []
   * @param {Object} options.metadata - The metadata object
   * @param {Object} options.window - The window instance
   */
  handleConnection(options) {
    const methodType = this.getMethodType(options.method);
    switch (methodType) {
      case 'UNARY':
        this.handleUnaryResponse(options);
        break;
      case 'CLIENT-STREAMING':
        this.handleClientStreamingResponse(options);
        break;
      case 'SERVER-STREAMING':
        this.handleServerStreamingResponse(options);
        break;
      case 'BIDI-STREAMING':
        this.handleBidiStreamingResponse(options);
        break;
      default:
        throw new Error(`Unsupported method type: ${methodType}`);
    }

  }

  async startConnection({ request, collection, environment, runtimeVariables, certificateChain, privateKey, rootCertificate, verifyOptions, window}) {
    const credentials = this.getChannelCredentials({ url: request.request.url, rootCertificate, privateKey, certificateChain, verifyOptions });

    console.log("received request", request);
    const { host, path } = parseGrpcUrl(request.request.url);
    const methodPath = request.request.method;
    const method = this.getMethodFromPath(methodPath);

    console.log("credentials", credentials);

    const Client = makeGenericClientConstructor({});
    const client = new Client(host, credentials);
    if (!client) {
      throw new Error('Failed to create client');
    }

    // Parse the message from JSON string
    console.log("request", request.request);
    let messages = request.draft ? request.draft.request.body.grpc : request.request.body.grpc;
    messages = messages.map(({content}) => JSON.parse(content));
      
    const requestPath = path + methodPath;
    const requestId = request.uid;
    const collectionUid = collection.uid;
    const metadata = new Metadata();
    console.log("request.request.headers", request.request.headers);
    request.request.headers.forEach((header) => {
      metadata.add(header.name, header.value);
    });

    console.log("message", messages);
    console.log("metadata", metadata.getMap());

    // Create a requestSent object similar to HTTP requests
    const requestSent = {
      url: request.request.url,
      method: request.request.method,
      methodType: this.getMethodType(method),
      headers: request.request.headers,
      metadata: metadata.getMap ? Object.entries(metadata.getMap()).map(([name, value]) => ({
        name,
        value: Array.isArray(value) ? value.join(', ') : value
      })) : [],
      body: {
        grpc: messages
      },
      timestamp: Date.now()
    };

    // Send the requestSent object to the renderer
    window.webContents.send('main:grpc-request-sent', requestId, collectionUid, requestSent);

    this.handleConnection({
      client,
      requestId,
      collectionUid,
      requestPath,
      method,
      messages,
      metadata,
      window
    });
  }
    
  sendMessage(requestId, body) {
    const connection = this.activeConnections.get(requestId);

    if (connection) {
      // Parse the body if it's a string
      const parsedBody = typeof body === 'string' ? JSON.parse(body) : body;
      
      connection.write(parsedBody, (error) => {
        if (error) {
          ipcMain.emit('grpc:error', requestId, { error });
        }
      });
    }
  }

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
      methods.forEach(method => {
        this.methods.set(method.path, method);
      });
      return methods
    }));

    const methodsWithType = methods.flat().map(method => ({
      ...method,
      type: this.getMethodType(method),
    }));
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
   * Check if a connection is active
   * @param {string} requestId - The request ID to check
   * @returns {boolean} - Whether the connection is active
   */
  isConnectionActive(requestId) {
    return this.activeConnections.has(requestId);
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

  /**
   * Generate a sample message for a specific method path
   * @param {string} methodPath - The full gRPC method path
   * @param {Object} options - Options for message generation
   * @returns {Object} A sample message or error
   */
  generateSampleMessage(methodPath, options = {}) {
    try {
      // Check if the method exists in the cache
      if (!this.methods.has(methodPath)) {
        return { 
          success: false, 
          error: `Method ${methodPath} not found in cache` 
        };
      }
      
      // Get the method definition
      const method = this.methods.get(methodPath);
      
      // Generate a sample message using our generator
      const sampleMessage = grpcMessageGenerator.generateGrpcSampleMessage(method, options);
      
      return {
        success: true,
        message: sampleMessage
      };
    } catch (error) {
      console.error('Error generating sample gRPC message:', error);
      return {
        success: false,
        error: error.message || 'Failed to generate sample message'
      };
    }
  }
}

const grpcClient = new GrpcClient();
module.exports = grpcClient;

if (typeof app.on === 'function') {
  app.on('window-all-closed', () => grpcClient.closeAll());
} else {
  console.warn('electron.app.on is not a function. Are you running a test?');
}
