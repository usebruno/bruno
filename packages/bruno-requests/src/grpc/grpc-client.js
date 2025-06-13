import { 
  makeGenericClientConstructor, 
  ChannelCredentials, 
  Metadata
} from '@grpc/grpc-js';
import * as grpcReflection from 'grpc-reflection-js';
import * as protoLoader from '@grpc/proto-loader';    
import { generateGrpcSampleMessage } from './grpcMessageGenerator';
import * as tls from 'tls';
import { isString } from 'lodash';
import * as nodePath from 'node:path';

/**
 * Configuration options for loading and parsing Protocol Buffers definitions.
 * These options are passed to @grpc/proto-loader and protobufjs.
 * @type {import('@grpc/proto-loader').Options}
 */
const configOptions = {
  keepCase: true,
  alternateCommentMode: true,
  preferTrailingComment: true,
  /**
   * Long conversion type.
   * Valid values are `String` and `Number` (the global types).
   * Defaults to copy the present value, which is a possibly unsafe number without and a {@link Long} with a long library.
   * 
   * JavaScript's Number type can only safely represent integers up to 2^53 - 1 (Number.MAX_SAFE_INTEGER).
   * Since gRPC's int64, uint64, sint64, and fixed64 types can exceed this limit, we convert them to strings
   * to preserve their full precision.
   */
  longs: String,
  enums: String,
  bytes: String,
  defaults: true,
  arrays: false,
  objects: false,
  oneofs: true,
  json: true
};

const replaceTabsWithSpaces = (str, numSpaces = 2) => {
  if (!str || !str.length || !isString(str)) {
    return '';
  }

  return str.replaceAll('\t', ' '.repeat(numSpaces)).replaceAll('\n', '');
};

const ensureBuffer = (data) => {
  if (Buffer.isBuffer(data)) {
    return data;
  }
  return Buffer.from(data, 'utf-8');
};

const processGrpcMetadata = (metadata) => {
  return Object.entries(metadata).map(([name, value]) => {
    if (Array.isArray(value)) {
      return {
        name,
        value: value.map(v => {
          if (v && typeof v === 'object' && v.type === 'Buffer' && Array.isArray(v.data)) {
            return Buffer.from(v.data).toString('base64');
          }
          return v.toString();
        }).join(', ')
      };
    }
    if (value && typeof value === 'object' && value.type === 'Buffer' && Array.isArray(value.data)) {
      return { name, value: Buffer.from(value.data).toString('base64') };
    }
    return { name, value: value.toString() };
  });
};

const getParsedGrpcUrlObject = (url) => {
  const isUnixSocket = str => str.startsWith('unix:');
  //const isXdsUrl = str => str.startsWith('xds:');
  const addProtocolIfMissing = str => str.includes('://') ? str : `grpc://${str}`;
  const removeTrailingSlash = str => str.endsWith('/') ? str.slice(0, -1) : str;

  if (!url) return { host: '', path: '' };
  if (isUnixSocket(url)) return { host: url, path: '' };
  // if (isXdsUrl(url)) return { host: url, path: '' }; /* TODO: add xds support, https://www.npmjs.com/package/@grpc/grpc-js-xds */

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
    const statusWithMetadata = {
      ...status,
      metadata: processGrpcMetadata(status.metadata.getMap ? status.metadata.getMap() : status.metadata)
    };
    callback('grpc:status', requestId, collectionUid, { status: statusWithMetadata, res });
    console.log(`grpc:status Request ${requestId} status ${JSON.stringify(status)} res ${JSON.stringify(res)}`);
  });

  rpc.on('error', (error) => {
    const errorWithMetadata = {
      ...error,
      metadata: processGrpcMetadata(error.metadata.getMap ? error.metadata.getMap() : error.metadata)
    };
    callback('grpc:error', requestId, collectionUid, { error: errorWithMetadata });
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
    const metadataWithProcessed = processGrpcMetadata(metadata.getMap ? metadata.getMap() : metadata);
    callback('grpc:metadata', requestId, collectionUid, { metadata: metadataWithProcessed });
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
    if (requestStream && responseStream) return 'bidi-streaming';
    if (requestStream) return 'client-streaming';
    if (responseStream) return 'server-streaming';
    return 'unary';
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
   * @param {string|null} passphrase - The passphrase for the private key, if available
   * @param {string|null} pfx - The PFX/P12 certificate data, if available
   * @param {VerifyOptions} verifyOptions - Additional options for verifying the server certificate
   * @returns {import('@grpc/grpc-js').ChannelCredentials} The gRPC channel credentials
   */
  _getChannelCredentials({ url, rootCertificate, privateKey, certificateChain, passphrase, pfx, verifyOptions }) {
    const securedProtocols = ['grpcs', 'https'];
    try {
      const isSecureConnection = securedProtocols.some(protocol => url.includes(protocol));
      if (!isSecureConnection) {
        return ChannelCredentials.createInsecure();
      }
      
      const rootCertBuffer = rootCertificate ? ensureBuffer(rootCertificate) : null;
      const clientCertBuffer = certificateChain ? ensureBuffer(certificateChain) : null;
      const privateKeyBuffer = privateKey ? ensureBuffer(privateKey) : null;
      const pfxBuffer = pfx ? ensureBuffer(pfx) : null;

      // Create proper SSL credentials with correct options
      const sslOptions = {
        ...(verifyOptions || {}),
        // Default to true if not specified
        rejectUnauthorized: verifyOptions?.rejectUnauthorized !== false
      };

      const shouldUseSecureContext = pfxBuffer || passphrase;

      if (shouldUseSecureContext) {
        const secureContext = tls.createSecureContext({
          ca: rootCertBuffer,
          key: privateKeyBuffer,
          cert: clientCertBuffer,
          pfx: pfxBuffer,
          passphrase: passphrase
        });
        return ChannelCredentials.createFromSecureContext(secureContext, sslOptions);
      }

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
   * @param {import('@grpc/grpc-js/src/make-client').ServiceClient} options.client - The client instance
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
      case 'unary':
        this.handleUnaryResponse(options);
        break;
      case 'client-streaming':
        this.handleClientStreamingResponse(options);
        break;
      case 'server-streaming':
        this.handleServerStreamingResponse(options);
        break;
      case 'bidi-streaming':
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

  /**
   * Starts a gRPC connection and handles the request based on the method type.
   * This method sets up the connection, creates the client, and initiates the appropriate
   * request handling based on whether it's unary, server streaming, client streaming, or bidirectional streaming.
   * 
   * @param {Object} params - The parameters for starting the connection
   * @param {Object} params.request - The gRPC request object
   * @param {string} params.request.url - The gRPC server URL (e.g., 'grpc://localhost:50051')
   * @param {string} params.request.method - The full method path (e.g., '/package.Service/Method')
   * @param {Object} params.request.body - The request body containing gRPC messages
   * @param {Object} params.request.headers - The request headers/metadata
   * @param {Object} params.collection - The collection object containing the request
   * @param {string} [params.certificateChain] - The client certificate chain for TLS
   * @param {string} [params.privateKey] - The client private key for TLS
   * @param {string} [params.rootCertificate] - The root/CA certificate for TLS
   * @param {string} [params.passphrase] - The passphrase for the private key if encrypted
   * @param {string} [params.pfx] - The PFX/P12 certificate data
   * @param {Object} [params.verifyOptions] - Additional options for verifying the server certificate
   * @param {import('@grpc/grpc-js').ChannelOptions} [params.channelOptions] - Additional options for the gRPC channel
   */
  async startConnection({ request, collection, certificateChain, privateKey, rootCertificate, passphrase, pfx, verifyOptions, channelOptions = {}}) {
    const credentials = this._getChannelCredentials({ url: request.url, rootCertificate, privateKey, certificateChain, passphrase, pfx, verifyOptions });
    const { host, path } = getParsedGrpcUrlObject(request.url);
    const methodPath = request.method;
    const method = this._getMethodFromPath(methodPath);
    const Client = makeGenericClientConstructor({});
    const client = new Client(host, credentials, channelOptions);
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
  async loadMethodsFromReflection({ request, collectionUid, rootCertificate, privateKey, certificateChain, passphrase, pfx, verifyOptions, sendEvent }) {
    const credentials = this._getChannelCredentials({ url: request.url, rootCertificate, privateKey, certificateChain, passphrase, pfx, verifyOptions });
    const { host, path } = getParsedGrpcUrlObject(request.url);
    const metadata = new Metadata();
    Object.entries(request.headers).forEach(([name, value]) => {
      metadata.add(name, value);
    });
    
    try {
      const client = new grpcReflection.Client(
          host,
          credentials,
          {},
          metadata
      );

      const declarations = await client.listServices();
      const methods = await Promise.all(declarations.map(async (declaration) => {
        const fileContainingSymbol = await client.fileContainingSymbol(declaration);
        const descriptor = fileContainingSymbol.toDescriptor('proto3');
        const protoDefinition = protoLoader.loadFileDescriptorSetFromObject(
          descriptor,
          configOptions
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

  /**
   * Generate a grpcurl command for a gRPC request
   * @param {Object} request -  request object
   * @param {Object} options.certificates - Certificate configuration
   * @returns {string} The generated grpcurl command
   */
  generateGrpcurlCommand({
    request,
    collectionPath = '',
    shell = 'bash',
    certificates = {}
  }) {
    const { url, method, methodType = 'unary', body, headers, protoPath } = request;
    const useReflection = !protoPath;
    const parts = [];
    const { host, path } = getParsedGrpcUrlObject(url);
    const { ca, cert, key } = certificates; 
    
    parts.push("grpcurl");

    if (url.startsWith('grpcs://') || url.startsWith('https://')) {
      if (ca) {
        /**
         * Instead of using certificate that relies on CN, use SANs
         * CN certificates seems to cause verification errors with grpcurl
         * https://github.com/fullstorydev/grpcurl/issues/320
         */
        parts.push(`-cacert ${ca}`);
      }
      if (cert && key) {
        /**
         * passphrase is not supported by grpcurl, so we need to decrypt the key first
         * When using key that is encrypted, use the passphrase to decrypt it
         * openssl rsa -in client.key -out client_decrypted.key
         * it will ask for passphrase, use the passphrase to decrypt the key
         * then use the decrypted key for making the request using grpcurl
        */
        parts.push(`-cert ${cert}`);
        parts.push(`-key ${key}`);
      }
    } else {
      parts.push("-plaintext");
    }

    for (const [key, value] of Object.entries(headers)) {
      parts.push(`-H "${key}: ${value}"`);
    }

    if (!useReflection && protoPath) {
      const absoluteProtoPath = collectionPath ? nodePath.resolve(collectionPath, protoPath) : protoPath;
      const importPath = nodePath.dirname(absoluteProtoPath);
      const protoFileName = nodePath.basename(absoluteProtoPath);
      parts.push(`-import-path ${importPath}`);
      parts.push(`-proto ${protoFileName}`);
    }

    const isClientStreaming = methodType === 'client-streaming' || methodType === 'bidi-streaming';

    if (body.grpc.length > 0) {
      if (isClientStreaming) {
        parts.push(`-d @`);
      } else {
        // For unary and server streaming, send as a single message
        parts.push(`-d '${replaceTabsWithSpaces(body.grpc[0].content)}'`);
      }
    }

    parts.push(host);

    parts.push(path.slice(1) + (path ? '/' : '') + (method.startsWith('/') ? method.slice(1) : method));

    if (isClientStreaming) {
      const messages = body.grpc.map(({content}) => replaceTabsWithSpaces(content));
      const stdinData = messages.join('\n');
      parts.push(`<< EOF\n${stdinData}\nEOF`);
    }

    return parts.join(" ");
  }
}

export { GrpcClient };

