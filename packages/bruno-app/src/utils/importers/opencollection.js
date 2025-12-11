import each from 'lodash/each';
import { uuid } from 'utils/common';
import { BrunoError } from 'utils/common/error';
import { validateSchema, updateUidsInCollection, hydrateSeqInCollection } from './common';

const fromOpenCollectionAuth = (auth) => {
  if (!auth) {
    return { mode: 'none' };
  }

  if (auth === 'inherit') {
    return { mode: 'inherit' };
  }

  switch (auth.type) {
    case 'basic':
      return {
        mode: 'basic',
        basic: {
          username: auth.username || '',
          password: auth.password || ''
        }
      };
    case 'bearer':
      return {
        mode: 'bearer',
        bearer: {
          token: auth.token || ''
        }
      };
    case 'digest':
      return {
        mode: 'digest',
        digest: {
          username: auth.username || '',
          password: auth.password || ''
        }
      };
    case 'ntlm':
      return {
        mode: 'ntlm',
        ntlm: {
          username: auth.username || '',
          password: auth.password || '',
          domain: auth.domain || ''
        }
      };
    case 'awsv4':
      return {
        mode: 'awsv4',
        awsv4: {
          accessKeyId: auth.accessKeyId || '',
          secretAccessKey: auth.secretAccessKey || '',
          sessionToken: auth.sessionToken || '',
          service: auth.service || '',
          region: auth.region || '',
          profileName: auth.profileName || ''
        }
      };
    case 'apikey':
      return {
        mode: 'apikey',
        apikey: {
          key: auth.key || '',
          value: auth.value || '',
          placement: auth.placement || 'header'
        }
      };
    case 'wsse':
      return {
        mode: 'wsse',
        wsse: {
          username: auth.username || '',
          password: auth.password || ''
        }
      };
    case 'oauth2':
      return fromOpenCollectionOAuth2(auth);
    default:
      return { mode: 'none' };
  }
};

const fromOpenCollectionOAuth2 = (auth) => {
  const getTokenPlacement = (tokenConfig) => {
    if (tokenConfig?.placement?.query) {
      return 'query';
    }
    return 'header';
  };

  const getTokenHeaderPrefix = (tokenConfig) => {
    if (tokenConfig?.placement?.header) {
      return tokenConfig.placement.header;
    }
    return 'Bearer';
  };

  const getTokenQueryKey = (tokenConfig) => {
    if (tokenConfig?.placement?.query) {
      return tokenConfig.placement.query;
    }
    return 'access_token';
  };

  const getCredentialsPlacement = (credentials) => {
    if (credentials?.placement === 'basic_auth_header') {
      return 'basic_auth_header';
    }
    return 'body';
  };

  switch (auth.flow) {
    case 'client_credentials':
      return {
        mode: 'oauth2',
        oauth2: {
          grantType: 'client_credentials',
          accessTokenUrl: auth.accessTokenUrl || '',
          refreshTokenUrl: auth.refreshTokenUrl || '',
          clientId: auth.credentials?.clientId || '',
          clientSecret: auth.credentials?.clientSecret || '',
          scope: auth.scope || '',
          credentialsPlacement: getCredentialsPlacement(auth.credentials),
          credentialsId: auth.tokenConfig?.id || 'credentials',
          tokenPlacement: getTokenPlacement(auth.tokenConfig),
          tokenHeaderPrefix: getTokenHeaderPrefix(auth.tokenConfig),
          tokenQueryKey: getTokenQueryKey(auth.tokenConfig),
          autoFetchToken: auth.settings?.autoFetchToken !== false,
          autoRefreshToken: auth.settings?.autoRefreshToken !== false
        }
      };
    case 'resource_owner_password':
      return {
        mode: 'oauth2',
        oauth2: {
          grantType: 'password',
          accessTokenUrl: auth.accessTokenUrl || '',
          refreshTokenUrl: auth.refreshTokenUrl || '',
          clientId: auth.credentials?.clientId || '',
          clientSecret: auth.credentials?.clientSecret || '',
          username: auth.resourceOwner?.username || '',
          password: auth.resourceOwner?.password || '',
          scope: auth.scope || '',
          credentialsPlacement: getCredentialsPlacement(auth.credentials),
          credentialsId: auth.tokenConfig?.id || 'credentials',
          tokenPlacement: getTokenPlacement(auth.tokenConfig),
          tokenHeaderPrefix: getTokenHeaderPrefix(auth.tokenConfig),
          tokenQueryKey: getTokenQueryKey(auth.tokenConfig),
          autoFetchToken: auth.settings?.autoFetchToken !== false,
          autoRefreshToken: auth.settings?.autoRefreshToken !== false
        }
      };
    case 'authorization_code':
      return {
        mode: 'oauth2',
        oauth2: {
          grantType: 'authorization_code',
          authorizationUrl: auth.authorizationUrl || '',
          accessTokenUrl: auth.accessTokenUrl || '',
          refreshTokenUrl: auth.refreshTokenUrl || '',
          callbackUrl: auth.callbackUrl || '',
          clientId: auth.credentials?.clientId || '',
          clientSecret: auth.credentials?.clientSecret || '',
          scope: auth.scope || '',
          pkce: auth.pkce?.enabled || false,
          credentialsPlacement: getCredentialsPlacement(auth.credentials),
          credentialsId: auth.tokenConfig?.id || 'credentials',
          tokenPlacement: getTokenPlacement(auth.tokenConfig),
          tokenHeaderPrefix: getTokenHeaderPrefix(auth.tokenConfig),
          tokenQueryKey: getTokenQueryKey(auth.tokenConfig),
          autoFetchToken: auth.settings?.autoFetchToken !== false,
          autoRefreshToken: auth.settings?.autoRefreshToken !== false
        }
      };
    case 'implicit':
      return {
        mode: 'oauth2',
        oauth2: {
          grantType: 'implicit',
          authorizationUrl: auth.authorizationUrl || '',
          callbackUrl: auth.callbackUrl || '',
          clientId: auth.credentials?.clientId || '',
          scope: auth.scope || '',
          state: auth.state || '',
          credentialsId: auth.tokenConfig?.id || 'credentials',
          tokenPlacement: getTokenPlacement(auth.tokenConfig),
          tokenHeaderPrefix: getTokenHeaderPrefix(auth.tokenConfig),
          tokenQueryKey: getTokenQueryKey(auth.tokenConfig),
          autoFetchToken: auth.settings?.autoFetchToken !== false
        }
      };
    default:
      return { mode: 'none' };
  }
};

const fromOpenCollectionHeaders = (headers) => {
  if (!headers?.length) return [];

  return headers.map((header) => ({
    name: header.name || '',
    value: header.value || '',
    description: header.description || '',
    enabled: header.disabled !== true
  }));
};

const fromOpenCollectionParams = (params) => {
  if (!params?.length) return [];

  return params.map((param) => ({
    name: param.name || '',
    value: param.value || '',
    description: param.description || '',
    type: param.type || 'query',
    enabled: param.disabled !== true
  }));
};

const fromOpenCollectionBody = (body, requestType = 'http') => {
  if (!body) {
    return { mode: 'none' };
  }

  if (requestType === 'graphql') {
    return {
      mode: 'graphql',
      graphql: {
        query: body.query || '',
        variables: body.variables || ''
      }
    };
  }

  switch (body.type) {
    case 'json':
      return { mode: 'json', json: body.data || '' };
    case 'text':
      return { mode: 'text', text: body.data || '' };
    case 'xml':
      return { mode: 'xml', xml: body.data || '' };
    case 'sparql':
      return { mode: 'sparql', sparql: body.data || '' };
    case 'form-urlencoded':
      return {
        mode: 'formUrlEncoded',
        formUrlEncoded: (body.data || []).map((field) => ({
          name: field.name || '',
          value: field.value || '',
          description: field.description || '',
          enabled: field.disabled !== true
        }))
      };
    case 'multipart-form':
      return {
        mode: 'multipartForm',
        multipartForm: (body.data || []).map((field) => ({
          name: field.name || '',
          type: field.type || 'text',
          value: field.value || '',
          description: field.description || '',
          enabled: field.disabled !== true
        }))
      };
    case 'file':
      return {
        mode: 'file',
        file: (body.data || []).map((file) => ({
          filePath: file.filePath || '',
          contentType: file.contentType || '',
          selected: file.selected !== false
        }))
      };
    default:
      return { mode: 'none' };
  }
};

const fromOpenCollectionVariables = (variables) => {
  if (!variables?.length) return { req: [], res: [] };

  return {
    req: variables.map((v) => ({
      name: v.name || '',
      value: typeof v.value === 'object' ? v.value.data || '' : v.value || '',
      description: v.description || '',
      enabled: v.disabled !== true
    })),
    res: []
  };
};

const fromOpenCollectionScripts = (scripts) => {
  const result = { req: '', res: '' };

  if (scripts?.preRequest) {
    result.req = scripts.preRequest;
  }
  if (scripts?.postResponse) {
    result.res = scripts.postResponse;
  }

  return result;
};

const fromOpenCollectionAssertions = (assertions) => {
  if (!assertions?.length) return [];

  return assertions.map((a) => ({
    name: a.expression || '',
    value: a.value || '',
    description: a.description || '',
    enabled: a.disabled !== true
  }));
};

const transformHttpItem = (item) => {
  const brunoItem = {
    type: 'http-request',
    name: item.name || 'Untitled Request',
    seq: item.seq || 1,
    request: {
      url: item.url || '',
      method: item.method || 'GET',
      headers: fromOpenCollectionHeaders(item.headers),
      params: fromOpenCollectionParams(item.params),
      body: fromOpenCollectionBody(item.body),
      auth: fromOpenCollectionAuth(item.auth),
      script: fromOpenCollectionScripts(item.scripts),
      vars: fromOpenCollectionVariables(item.variables),
      assertions: fromOpenCollectionAssertions(item.assertions),
      tests: item.scripts?.tests || '',
      docs: item.docs || ''
    }
  };

  if (item.tags?.length) {
    brunoItem.tags = item.tags;
  }

  if (item.examples?.length) {
    brunoItem.examples = item.examples.map((example) => ({
      name: example.name || 'Untitled Example',
      description: example.description || '',
      type: 'http-request',
      request: {
        url: example.request?.url || item.url || '',
        method: example.request?.method || item.method || 'GET',
        headers: fromOpenCollectionHeaders(example.request?.headers),
        params: fromOpenCollectionParams(example.request?.params),
        body: fromOpenCollectionBody(example.request?.body)
      },
      response: {
        status: String(example.response?.status || 200),
        statusText: example.response?.statusText || 'OK',
        headers: fromOpenCollectionHeaders(example.response?.headers),
        body: example.response?.body ? {
          type: example.response.body.type || 'text',
          content: example.response.body.data || ''
        } : undefined
      }
    }));
  }

  return brunoItem;
};

const transformGraphqlItem = (item) => {
  const brunoItem = {
    type: 'graphql-request',
    name: item.name || 'Untitled Request',
    seq: item.seq || 1,
    request: {
      url: item.url || '',
      method: item.method || 'POST',
      headers: fromOpenCollectionHeaders(item.headers),
      params: fromOpenCollectionParams(item.params),
      body: fromOpenCollectionBody(item.body, 'graphql'),
      auth: fromOpenCollectionAuth(item.auth),
      script: fromOpenCollectionScripts(item.scripts),
      vars: fromOpenCollectionVariables(item.variables),
      assertions: fromOpenCollectionAssertions(item.assertions),
      tests: item.scripts?.tests || '',
      docs: item.docs || ''
    }
  };

  if (item.tags?.length) {
    brunoItem.tags = item.tags;
  }

  return brunoItem;
};

const transformGrpcItem = (item) => {
  const grpcMessages = [];

  if (item.message) {
    if (typeof item.message === 'string') {
      grpcMessages.push({ name: 'message 1', content: item.message });
    } else if (Array.isArray(item.message)) {
      item.message.forEach((msg, index) => {
        grpcMessages.push({
          name: msg.title || `message ${index + 1}`,
          content: msg.message || '',
          selected: msg.selected || false
        });
      });
    }
  }

  const brunoItem = {
    type: 'grpc-request',
    name: item.name || 'Untitled Request',
    seq: item.seq || 1,
    request: {
      url: item.url || '',
      method: item.method || '',
      methodType: item.methodType || 'unary',
      protoPath: item.protoFilePath || '',
      headers: fromOpenCollectionHeaders(item.metadata),
      body: {
        mode: 'grpc',
        grpc: grpcMessages
      },
      auth: fromOpenCollectionAuth(item.auth),
      script: fromOpenCollectionScripts(item.scripts),
      vars: fromOpenCollectionVariables(item.variables),
      assertions: fromOpenCollectionAssertions(item.assertions),
      tests: item.scripts?.tests || '',
      docs: item.docs || ''
    }
  };

  if (item.tags?.length) {
    brunoItem.tags = item.tags;
  }

  return brunoItem;
};

const transformWebsocketItem = (item) => {
  const wsMessages = [];

  if (item.message) {
    if (item.message.type && item.message.data !== undefined) {
      wsMessages.push({
        name: 'message 1',
        type: item.message.type || 'json',
        content: item.message.data || ''
      });
    } else if (Array.isArray(item.message)) {
      item.message.forEach((msg, index) => {
        wsMessages.push({
          name: msg.title || `message ${index + 1}`,
          type: msg.message?.type || 'json',
          content: msg.message?.data || '',
          selected: msg.selected || false
        });
      });
    }
  }

  const brunoItem = {
    type: 'ws-request',
    name: item.name || 'Untitled Request',
    seq: item.seq || 1,
    request: {
      url: item.url || '',
      headers: fromOpenCollectionHeaders(item.headers),
      body: {
        mode: 'ws',
        ws: wsMessages
      },
      auth: fromOpenCollectionAuth(item.auth),
      script: fromOpenCollectionScripts(item.scripts),
      vars: fromOpenCollectionVariables(item.variables),
      tests: item.scripts?.tests || '',
      docs: item.docs || ''
    }
  };

  if (item.tags?.length) {
    brunoItem.tags = item.tags;
  }

  return brunoItem;
};

const transformFolder = (folder) => {
  const brunoFolder = {
    type: 'folder',
    name: folder.name || 'Untitled Folder',
    seq: folder.seq || 1
  };

  if (folder.request || folder.docs) {
    brunoFolder.root = {};

    if (folder.request) {
      brunoFolder.root.request = {
        headers: fromOpenCollectionHeaders(folder.request.headers),
        auth: fromOpenCollectionAuth(folder.request.auth),
        script: fromOpenCollectionScripts(folder.request.scripts),
        vars: fromOpenCollectionVariables(folder.request.variables),
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
    brunoFolder.items = transformItems(folder.items);
  }

  return brunoFolder;
};

const transformItem = (item) => {
  switch (item.type) {
    case 'http':
      return transformHttpItem(item);
    case 'graphql':
      return transformGraphqlItem(item);
    case 'grpc':
      return transformGrpcItem(item);
    case 'websocket':
      return transformWebsocketItem(item);
    case 'folder':
      return transformFolder(item);
    case 'script':
      return {
        type: 'js',
        name: 'script.js',
        raw: item.script || '',
        fileContent: item.script || ''
      };
    default:
      return null;
  }
};

const transformItems = (items) => {
  return (items || [])
    .map(transformItem)
    .filter(Boolean);
};

const transformEnvironments = (environments) => {
  if (!environments?.length) return [];

  return environments.map((env) => ({
    name: env.name || 'Untitled Environment',
    variables: (env.variables || []).map((v) => ({
      name: v.name || '',
      value: typeof v.value === 'object' ? v.value.data || '' : v.value || '',
      type: 'text',
      enabled: v.disabled !== true,
      secret: v.transient || false
    }))
  }));
};

const transformBrunoConfig = (openCollection) => {
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

const transformCollectionRoot = (openCollection) => {
  const root = {};

  if (openCollection.request) {
    root.request = {
      headers: fromOpenCollectionHeaders(openCollection.request.headers),
      auth: fromOpenCollectionAuth(openCollection.request.auth),
      script: fromOpenCollectionScripts(openCollection.request.scripts),
      vars: fromOpenCollectionVariables(openCollection.request.variables),
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

export const openCollectionToBruno = (openCollection) => {
  const brunoCollection = {
    name: openCollection.info?.name || 'Untitled Collection',
    version: '1',
    items: transformItems(openCollection.items),
    environments: transformEnvironments(openCollection.config?.environments),
    brunoConfig: transformBrunoConfig(openCollection),
    root: transformCollectionRoot(openCollection)
  };

  return brunoCollection;
};

const addUidsToRoot = (collection) => {
  if (collection.root?.request?.headers) {
    each(collection.root.request.headers, (header) => {
      header.uid = uuid();
    });
  }
  if (collection.root?.request?.vars?.req) {
    each(collection.root.request.vars.req, (v) => {
      v.uid = uuid();
    });
  }
  if (collection.root?.request?.vars?.res) {
    each(collection.root.request.vars.res, (v) => {
      v.uid = uuid();
    });
  }

  const addUidsToFolderRoot = (items) => {
    each(items, (item) => {
      if (item.type === 'folder') {
        if (item.root?.request?.headers) {
          each(item.root.request.headers, (header) => {
            header.uid = uuid();
          });
        }
        if (item.root?.request?.vars?.req) {
          each(item.root.request.vars.req, (v) => {
            v.uid = uuid();
          });
        }
        if (item.root?.request?.vars?.res) {
          each(item.root.request.vars.res, (v) => {
            v.uid = uuid();
          });
        }
        if (item.items?.length) {
          addUidsToFolderRoot(item.items);
        }
      }
    });
  };

  addUidsToFolderRoot(collection.items);
  return collection;
};

export const processOpenCollection = async (jsonData) => {
  try {
    let collection = openCollectionToBruno(jsonData);
    collection = hydrateSeqInCollection(collection);
    collection = updateUidsInCollection(collection);
    collection = addUidsToRoot(collection);
    await validateSchema(collection);
    return collection;
  } catch (err) {
    console.error('Error processing OpenCollection:', err);
    throw new BrunoError('Import OpenCollection failed');
  }
};

export const isOpenCollection = (data) => {
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  if (typeof data.opencollection !== 'string' || !data.opencollection.trim()) {
    return false;
  }

  if (typeof data.info !== 'object' || data.info === null) {
    return false;
  }

  return true;
};
