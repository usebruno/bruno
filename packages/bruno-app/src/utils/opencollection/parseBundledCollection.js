import { uuid } from 'utils/common';
import {
  toBrunoAuth,
  toBrunoHeaders,
  toBrunoParams,
  toBrunoBody,
  toBrunoVariables,
  toBrunoScripts,
  toBrunoAssertions
} from './common';

const parseHttpItem = (item) => {
  const brunoItem = {
    uid: uuid(),
    type: 'http-request',
    name: item.name || 'Untitled Request',
    seq: item.seq || 1,
    request: {
      url: item.url || '',
      method: item.method || 'GET',
      headers: toBrunoHeaders(item.headers),
      params: toBrunoParams(item.params),
      body: toBrunoBody(item.body),
      auth: toBrunoAuth(item.auth),
      script: toBrunoScripts(item.scripts),
      vars: toBrunoVariables(item.variables),
      assertions: toBrunoAssertions(item.assertions),
      tests: item.scripts?.tests || '',
      docs: item.docs || ''
    }
  };

  if (item.tags?.length) {
    brunoItem.tags = item.tags;
  }

  if (item.examples?.length) {
    brunoItem.examples = item.examples.map((example) => ({
      uid: uuid(),
      name: example.name || 'Untitled Example',
      description: example.description || '',
      type: 'http-request',
      request: {
        url: example.request?.url || item.url || '',
        method: example.request?.method || item.method || 'GET',
        headers: toBrunoHeaders(example.request?.headers),
        params: toBrunoParams(example.request?.params),
        body: toBrunoBody(example.request?.body)
      },
      response: {
        status: String(example.response?.status || 200),
        statusText: example.response?.statusText || 'OK',
        headers: toBrunoHeaders(example.response?.headers),
        body: example.response?.body ? {
          type: example.response.body.type || 'text',
          content: example.response.body.data || ''
        } : undefined
      }
    }));
  }

  return brunoItem;
};

const parseGraphqlItem = (item) => {
  const brunoItem = {
    uid: uuid(),
    type: 'graphql-request',
    name: item.name || 'Untitled Request',
    seq: item.seq || 1,
    request: {
      url: item.url || '',
      method: item.method || 'POST',
      headers: toBrunoHeaders(item.headers),
      params: toBrunoParams(item.params),
      body: toBrunoBody(item.body, 'graphql'),
      auth: toBrunoAuth(item.auth),
      script: toBrunoScripts(item.scripts),
      vars: toBrunoVariables(item.variables),
      assertions: toBrunoAssertions(item.assertions),
      tests: item.scripts?.tests || '',
      docs: item.docs || ''
    }
  };

  if (item.tags?.length) {
    brunoItem.tags = item.tags;
  }

  return brunoItem;
};

const parseGrpcItem = (item) => {
  const grpcMessages = [];

  if (item.message) {
    if (typeof item.message === 'string') {
      grpcMessages.push({ uid: uuid(), name: 'message 1', content: item.message });
    } else if (Array.isArray(item.message)) {
      item.message.forEach((msg, index) => {
        grpcMessages.push({
          uid: uuid(),
          name: msg.title || `message ${index + 1}`,
          content: msg.message || '',
          selected: msg.selected || false
        });
      });
    }
  }

  const brunoItem = {
    uid: uuid(),
    type: 'grpc-request',
    name: item.name || 'Untitled Request',
    seq: item.seq || 1,
    request: {
      url: item.url || '',
      method: item.method || '',
      methodType: item.methodType || 'unary',
      protoPath: item.protoFilePath || '',
      headers: toBrunoHeaders(item.metadata),
      body: {
        mode: 'grpc',
        grpc: grpcMessages
      },
      auth: toBrunoAuth(item.auth),
      script: toBrunoScripts(item.scripts),
      vars: toBrunoVariables(item.variables),
      assertions: toBrunoAssertions(item.assertions),
      tests: item.scripts?.tests || '',
      docs: item.docs || ''
    }
  };

  if (item.tags?.length) {
    brunoItem.tags = item.tags;
  }

  return brunoItem;
};

const parseWebsocketItem = (item) => {
  const wsMessages = [];

  if (item.message) {
    if (item.message.type && item.message.data !== undefined) {
      wsMessages.push({
        uid: uuid(),
        name: 'message 1',
        type: item.message.type || 'json',
        content: item.message.data || ''
      });
    } else if (Array.isArray(item.message)) {
      item.message.forEach((msg, index) => {
        wsMessages.push({
          uid: uuid(),
          name: msg.title || `message ${index + 1}`,
          type: msg.message?.type || 'json',
          content: msg.message?.data || '',
          selected: msg.selected || false
        });
      });
    }
  }

  const brunoItem = {
    uid: uuid(),
    type: 'ws-request',
    name: item.name || 'Untitled Request',
    seq: item.seq || 1,
    request: {
      url: item.url || '',
      headers: toBrunoHeaders(item.headers),
      body: {
        mode: 'ws',
        ws: wsMessages
      },
      auth: toBrunoAuth(item.auth),
      script: toBrunoScripts(item.scripts),
      vars: toBrunoVariables(item.variables),
      tests: item.scripts?.tests || '',
      docs: item.docs || ''
    }
  };

  if (item.tags?.length) {
    brunoItem.tags = item.tags;
  }

  return brunoItem;
};

const parseFolder = (folder) => {
  const brunoFolder = {
    uid: uuid(),
    type: 'folder',
    name: folder.name || 'Untitled Folder',
    seq: folder.seq || 1
  };

  if (folder.request || folder.docs) {
    brunoFolder.root = {};

    if (folder.request) {
      brunoFolder.root.request = {
        headers: toBrunoHeaders(folder.request.headers),
        auth: toBrunoAuth(folder.request.auth),
        script: toBrunoScripts(folder.request.scripts),
        vars: toBrunoVariables(folder.request.variables),
        tests: folder.request.scripts?.tests || ''
      };
    }

    if (folder.docs) {
      brunoFolder.root.docs = typeof folder.docs === 'string' ? folder.docs : folder.docs.content || '';
    }

    brunoFolder.root.meta = {
      name: folder.name || 'Untitled Folder',
      seq: folder.seq || 1
    };
  }

  if (folder.tags?.length) {
    brunoFolder.tags = folder.tags;
  }

  if (folder.items?.length) {
    brunoFolder.items = parseItems(folder.items);
  }

  return brunoFolder;
};

const parseItem = (item) => {
  switch (item.type) {
    case 'http':
      return parseHttpItem(item);
    case 'graphql':
      return parseGraphqlItem(item);
    case 'grpc':
      return parseGrpcItem(item);
    case 'websocket':
      return parseWebsocketItem(item);
    case 'folder':
      return parseFolder(item);
    case 'script':
      return {
        uid: uuid(),
        type: 'js',
        name: 'script.js',
        raw: item.script || '',
        fileContent: item.script || ''
      };
    default:
      return null;
  }
};

const parseItems = (items) => {
  return (items || [])
    .map(parseItem)
    .filter(Boolean);
};

const parseEnvironments = (environments) => {
  if (!environments?.length) return [];

  return environments.map((env) => ({
    uid: uuid(),
    name: env.name || 'Untitled Environment',
    variables: (env.variables || []).map((v) => ({
      uid: uuid(),
      name: v.name || '',
      value: typeof v.value === 'object' ? v.value.data || '' : v.value || '',
      type: 'text',
      enabled: v.disabled !== true,
      secret: v.transient || false
    }))
  }));
};

const parseBrunoConfig = (openCollection) => {
  const brunoConfig = {
    version: '1',
    name: openCollection.info?.name || 'Untitled Collection',
    type: 'collection',
    ignore: openCollection.extensions?.ignore || ['node_modules', '.git']
  };

  const config = openCollection.config;
  if (!config) return brunoConfig;

  if (config.protobuf) {
    brunoConfig.protobuf = {};

    if (config.protobuf.protoFiles?.length) {
      brunoConfig.protobuf.protoFiles = config.protobuf.protoFiles.map((f) => ({
        path: f.path
      }));
    }

    if (config.protobuf.importPaths?.length) {
      brunoConfig.protobuf.importPaths = config.protobuf.importPaths.map((p) => ({
        path: p.path,
        disabled: p.disabled || false
      }));
    }
  }

  if (config.proxy && config.proxy !== false) {
    if (config.proxy === 'inherit') {
      brunoConfig.proxy = { enabled: 'global' };
    } else {
      brunoConfig.proxy = {
        enabled: true,
        protocol: config.proxy.protocol || 'http',
        hostname: config.proxy.hostname || '',
        port: config.proxy.port || 0
      };

      if (config.proxy.auth) {
        brunoConfig.proxy.auth = {
          enabled: true,
          username: config.proxy.auth.username || '',
          password: config.proxy.auth.password || ''
        };
      }

      if (config.proxy.bypassProxy) {
        brunoConfig.proxy.bypassProxy = config.proxy.bypassProxy;
      }
    }
  }

  if (config.clientCertificates?.length) {
    brunoConfig.clientCertificates = {
      certs: config.clientCertificates.map((cert) => {
        if (cert.type === 'pem') {
          return {
            domain: cert.domain || '',
            type: 'pem',
            certFilePath: cert.certificateFilePath || '',
            keyFilePath: cert.privateKeyFilePath || '',
            passphrase: cert.passphrase || ''
          };
        } else if (cert.type === 'pkcs12') {
          return {
            domain: cert.domain || '',
            type: 'pkcs12',
            pfxFilePath: cert.pkcs12FilePath || '',
            passphrase: cert.passphrase || ''
          };
        }
        return null;
      }).filter(Boolean)
    };
  }

  return brunoConfig;
};

const parseCollectionRoot = (openCollection) => {
  const root = {};

  if (openCollection.request) {
    root.request = {
      headers: toBrunoHeaders(openCollection.request.headers),
      auth: toBrunoAuth(openCollection.request.auth),
      script: toBrunoScripts(openCollection.request.scripts),
      vars: toBrunoVariables(openCollection.request.variables),
      tests: openCollection.request.scripts?.tests || ''
    };
  }

  if (openCollection.docs) {
    root.docs = typeof openCollection.docs === 'string' ? openCollection.docs : openCollection.docs.content || '';
  }

  root.meta = {
    name: openCollection.info?.name || 'Untitled Collection'
  };

  return root;
};

export const parseBundledCollection = (openCollection) => {
  const brunoCollection = {
    name: openCollection.info?.name || 'Untitled Collection',
    version: '1',
    items: parseItems(openCollection.items),
    environments: parseEnvironments(openCollection.config?.environments),
    brunoConfig: parseBrunoConfig(openCollection),
    root: parseCollectionRoot(openCollection)
  };

  return brunoCollection;
};

export default parseBundledCollection;
