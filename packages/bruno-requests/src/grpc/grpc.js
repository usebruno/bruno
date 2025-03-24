import { 
  makeGenericClientConstructor, 
  ChannelCredentials, 
  Metadata,
  status
} from '@grpc/grpc-js';
import * as grpcReflection from 'grpc-reflection-js';
import * as protoLoader from '@grpc/proto-loader';    
import { generateGrpcSampleMessage } from './grpcMessageGenerator';


const configOptions = {
  keepCase: true,
  alternateCommentMode: true,
  preferTrailingComment: true,
  longs: String,
  enums: String,
  bytes: String,
  defaults: true,
  arrays: false,
  objects: false,
  oneofs: true,
  json: true
};

const getParsedGrpcUrlObject = (url) => {
  const isUnixSocket = str => str.startsWith('unix:');
  const addProtocolIfMissing = str => str.includes('://') ? str : `grpc://${str}`;
  const removeTrailingSlash = str => str.endsWith('/') ? str.slice(0, -1) : str;

  if (!url) return { host: '', path: '' };
  if (isUnixSocket(url)) return { host: url, path: '' };

  const urlObj = new URL(addProtocolIfMissing(url.toLowerCase()));
  return {
    host: urlObj.host,
    path: removeTrailingSlash(urlObj.pathname)
  };
};

/**
 * Handles gRPC events and forwards them using the provided callback
 * @param {Function} callback - Callback function to send events
 * @param {string} requestId - The unique ID of the request
 * @param {string} collectionUid - The collection UID
 * @param {Object} rpc - The gRPC object
 */
const setupGrpcEventHandlers = (callback, requestId, collectionUid, rpc) => {
  
  rpc.on('status', (status, res) => {
    callback('grpc:status', requestId, collectionUid, { status, res });
    console.log(`grpc:status Request ${requestId} status ${JSON.stringify(status)} res ${JSON.stringify(res)}`);
  });

  rpc.on('error', (error) => {
    callback('grpc:error', requestId, collectionUid, { error });
    console.log(`grpc:error Request ${requestId} ${error}`);
  });

  rpc.on('end', (res) => {
    callback('grpc:server-end-stream', requestId, collectionUid, { res });
    console.log(`grpc:end Request ${requestId} ended ${JSON.stringify(res)}`);
    const channel = rpc?.call?.channel;
    if (channel) channel.close();
  });

  rpc.on('data', (res) => {
    callback('grpc:response', requestId, collectionUid, { error: null, res });
    console.log(`grpc:response Request ${requestId} received data ${JSON.stringify(res)}`);
  });

  rpc.on('cancel', (res) => {
    callback('grpc:server-cancel-stream', requestId, collectionUid, { res });
    console.log(`grpc:cancel Request ${requestId} cancelled ${JSON.stringify(res)}`);
    
    const channel = rpc?.call?.channel;
    if (channel) channel.close();
  });

  rpc.on('metadata', (metadata) => {
    callback('grpc:metadata', requestId, collectionUid, { metadata });
    console.log(`grpc:metadata Request ${requestId} received metadata ${JSON.stringify(metadata)}`);
  });
};



class GrpcClient {
  constructor(eventCallback) {
    this.activeConnections = new Map();
    this.methods = new Map();
    this.eventCallback = eventCallback;
  }

  /**
   * Get method type based on streaming configuration
   */
  _getMethodType({ requestStream, responseStream }) {
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
  _getChannelCredentials({ url, rootCertificate, privateKey, certificateChain, verifyOptions }) {
    try {
      const isSecureConnection = url.includes('grpcs:');
      if (!isSecureConnection) {
        return ChannelCredentials.createInsecure();
      }
      
      const rootCertBuffer = rootCertificate ? Buffer.from(rootCertificate, 'utf-8') : null;
      const clientCertBuffer = certificateChain ? Buffer.from(certificateChain, 'utf-8') : null;
      const privateKeyBuffer = privateKey ? Buffer.from(privateKey, 'utf-8') : null;

      // Create proper SSL credentials with correct options
      const sslOptions = {
        ...(verifyOptions || {}),
        // Default to true if not specified
        rejectUnauthorized: verifyOptions?.rejectUnauthorized !== false
      };

      const credentials = ChannelCredentials.createSsl(
        rootCertBuffer, 
        privateKeyBuffer, 
        clientCertBuffer, 
        sslOptions
      );
      
      return credentials;
    } catch (error) {
      console.error("Error creating channel credentials:", error);
      // Default to insecure as fallback
      return ChannelCredentials.createInsecure();
    }
  }

  /**
   * Get method from the path
   */
  _getMethodFromPath(path) {
    if (this.methods.has(path)) {
      return this.methods.get(path);
    }
    throw new Error(`Method ${path} not found`);
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
   */
  handleConnection(options) {
    const methodType = this._getMethodType(options.method);
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

  /**
   * Handle unary responses
   */
  handleUnaryResponse({ client, requestId, requestPath, method, messages, metadata, collectionUid }) {
    const rpc = client.makeUnaryRequest(requestPath, method.requestSerialize, method.responseDeserialize, messages[0], metadata, (error, res) => {
      this.eventCallback('grpc:response', requestId, collectionUid, { error, res });
    });
    
    setupGrpcEventHandlers(this.eventCallback, requestId, collectionUid, rpc);
  }

  handleClientStreamingResponse({ client, requestId, requestPath, method, metadata, collectionUid }) {
    const rpc = client.makeClientStreamRequest(requestPath, method.requestSerialize, method.responseDeserialize, metadata, (error, res) => {
      this.eventCallback('grpc:response', requestId, collectionUid, { error, res });
    });
    this._addConnection(requestId, rpc);

    setupGrpcEventHandlers(this.eventCallback, requestId, collectionUid, rpc);
  }

  handleServerStreamingResponse({ client, requestId, requestPath, method, messages, metadata, collectionUid }) {
    const message = messages[0];
    const rpc = client.makeServerStreamRequest(requestPath, method.requestSerialize, method.responseDeserialize, message, metadata, (error, res) => {
      this.eventCallback('grpc:response', requestId, collectionUid, { error, res });
    });
    this._addConnection(requestId, rpc);
  
    setupGrpcEventHandlers(this.eventCallback, requestId, collectionUid, rpc);
  }

  handleBidiStreamingResponse({ client, requestId, requestPath, method, messages, metadata, collectionUid }) {
    const rpc = client.makeBidiStreamRequest(requestPath, method.requestSerialize, method.responseDeserialize, metadata);
    this._addConnection(requestId, rpc);

    setupGrpcEventHandlers(this.eventCallback, requestId, collectionUid, rpc);
  }

  async startConnection({ request, collection, certificateChain, privateKey, rootCertificate, verifyOptions }) {
    const credentials = this._getChannelCredentials({ url: request.url, rootCertificate, privateKey, certificateChain, verifyOptions });
    const { host, path } = getParsedGrpcUrlObject(request.url);
    const methodPath = request.method;
    const method = this._getMethodFromPath(methodPath);
    const Client = makeGenericClientConstructor({});
    const client = new Client(host, credentials);
    if (!client) {
      throw new Error('Failed to create client');
    }

    let messages = request.body.grpc;
    messages = messages.map(({content}) => JSON.parse(content));
      
    const requestPath = path + methodPath;
    const requestId = request.uid;
    const collectionUid = collection.uid;
    const metadata = new Metadata();
    Object.entries(request.headers).forEach(([name, value]) => {
      metadata.add(name, value);
    });

    // Create a requestSent object similar to HTTP requests
    const requestSent = {
      url: request.url,
      method: request.method,
      methodType: this._getMethodType(method),
      headers: request.headers,
      body: {
        grpc: messages
      },
      timestamp: Date.now()
    };

    // Send the requestSent object to the renderer
    this.eventCallback('main:grpc-request-sent', requestId, collectionUid, requestSent);

    this.handleConnection({
      client,
      requestId,
      collectionUid,
      requestPath,
      method,
      messages,
      metadata,
    });
  }
    
  sendMessage(requestId, body) {
    const connection = this.activeConnections.get(requestId);

    if (connection) {
      // Parse the body if it's a string
      const parsedBody = typeof body === 'string' ? JSON.parse(body) : body;
      
      connection.write(parsedBody, (error) => {
        if (error) {
          this.eventCallback('grpc:error', requestId, collectionUid, { error });
        }
      });
    }
  }

  /**
   * Load methods from server reflection
   */
  async loadMethodsFromReflection({ request, collectionUid, rootCertificate, privateKey, certificateChain, verifyOptions, sendEvent }) {
    console.log('loadMethodsFromReflection', request, rootCertificate, privateKey, certificateChain, verifyOptions);
    const credentials = this._getChannelCredentials({ url: request.url, rootCertificate, privateKey, certificateChain, verifyOptions });
    const { host, path } = getParsedGrpcUrlObject(request.url);
    const metadata = new Metadata();
    Object.entries(request.headers).forEach(([name, value]) => {
      metadata.add(name, value);
    });
    
    try {
      const client = new grpcReflection.Client(
          host,
          credentials,
          configOptions,
          metadata
      );

      const declarations = await client.listServices();
      const methods = await Promise.all(declarations.map(async (declaration) => {
        const fileContainingSymbol = await client.fileContainingSymbol(declaration);
        const descriptor = fileContainingSymbol.toDescriptor('proto3');
        const protoDefinition = protoLoader.loadFileDescriptorSetFromObject(
          descriptor,
          {}
        );
        const serviceDefinition = protoDefinition[declaration] 
        if(!!serviceDefinition?.format) {
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
        type: this._getMethodType(method),
      }));
      return methodsWithType;
    } catch (error) {
      console.error('Error in gRPC reflection:', error);
      sendEvent('grpc:error', request.uid, collectionUid, { error });
      throw error;
    }
  }

  /**
   * Load methods from proto file
   */
  async loadMethodsFromProtoFile(filePath, includeDirs = []) {
    const protoDefinition = await protoLoader.load(filePath, {...configOptions, includeDirs});
    const methods = Object.values(protoDefinition).filter((definition) => !definition?.format).flatMap(Object.values);
    const methodsWithType = methods.map(method => ({
      ...method,
      type: this._getMethodType(method),
    }));
    methods.forEach(method => {
      this.methods.set(method.path, method);
    });
    return methodsWithType;
  }

  end(requestId) {
    const connection = this.activeConnections.get(requestId);
    if (connection && typeof connection.end === 'function') {
      connection.end();
      this._removeConnection(requestId);
    }
  }

  cancel(requestId) {
    const connection = this.activeConnections.get(requestId);
    if (connection && typeof connection.cancel === 'function') {
      connection.cancel();
      this._removeConnection(requestId);
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
   * Clear all active connections
   */
  clearAllConnections() {
    const connectionIds = this.getActiveConnectionIds();
    
    this.activeConnections.forEach(connection => {
      if (typeof connection.cancel === 'function') {
        connection.cancel();
      }
    });
    
    this.activeConnections.clear();
    
    // Emit an event with empty active connection IDs
    if (connectionIds.length > 0) {
      this.eventCallback('grpc:connections-changed', {
        type: 'cleared',
        activeConnectionIds: []
      });
    }
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
      const sampleMessage = generateGrpcSampleMessage(method, options);
      
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

  /**
   * Get all active connection IDs
   * @returns {string[]} Array of active connection IDs
   */
  getActiveConnectionIds() {
    return Array.from(this.activeConnections.keys());
  }

  /**
   * Add a connection to the active connections map and emit an event
   * @param {string} requestId - The request ID
   * @param {Object} connection - The connection object
   * @private
   */
  _addConnection(requestId, connection) {
    this.activeConnections.set(requestId, connection);
    
    // Emit an event with all active connection IDs
    this.eventCallback('grpc:connections-changed', {
      type: 'added',
      requestId,
      activeConnectionIds: this.getActiveConnectionIds()
    });
  }

  /**
   * Remove a connection from the active connections map and emit an event
   * @param {string} requestId - The request ID
   * @private
   */
  _removeConnection(requestId) {
    if (this.activeConnections.has(requestId)) {
      this.activeConnections.delete(requestId);
      
      // Emit an event with all active connection IDs
      this.eventCallback('grpc:connections-changed', {
        type: 'removed',
        requestId,
        activeConnectionIds: this.getActiveConnectionIds()
      });
    }
  }
}

export { GrpcClient };

