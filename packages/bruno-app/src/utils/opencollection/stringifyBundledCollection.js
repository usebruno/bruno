import {
  toOpenCollectionAuth,
  toOpenCollectionHeaders,
  toOpenCollectionParams,
  toOpenCollectionBody,
  toOpenCollectionVariables,
  toOpenCollectionScripts,
  toOpenCollectionAssertions
} from './common';

const stringifyHttpRequest = (item) => {
  const request = item.request || {};

  const ocRequest = {
    type: 'http',
    name: item.name || 'Untitled Request',
    ...(item.seq && { seq: item.seq }),
    url: request.url || '',
    method: request.method || 'GET'
  };

  const headers = toOpenCollectionHeaders(request.headers);
  if (headers) ocRequest.headers = headers;

  const params = toOpenCollectionParams(request.params);
  if (params) ocRequest.params = params;

  const body = toOpenCollectionBody(request.body);
  if (body) ocRequest.body = body;

  const auth = toOpenCollectionAuth(request.auth);
  if (auth) ocRequest.auth = auth;

  const scripts = toOpenCollectionScripts(request);
  if (scripts) ocRequest.scripts = scripts;

  const variables = toOpenCollectionVariables(request.vars);
  if (variables) ocRequest.variables = variables;

  const assertions = toOpenCollectionAssertions(request.assertions);
  if (assertions) ocRequest.assertions = assertions;

  if (request.docs) {
    ocRequest.docs = request.docs;
  }

  if (item.tags?.length) {
    ocRequest.tags = item.tags;
  }

  if (item.examples?.length) {
    ocRequest.examples = item.examples.map((example) => {
      const ocExample = {
        name: example.name || 'Untitled Example'
      };

      if (example.description) {
        ocExample.description = example.description;
      }

      if (example.request) {
        ocExample.request = {
          url: example.request.url || '',
          method: example.request.method || 'GET'
        };

        const exHeaders = toOpenCollectionHeaders(example.request.headers);
        if (exHeaders) ocExample.request.headers = exHeaders;

        const exParams = toOpenCollectionParams(example.request.params);
        if (exParams) ocExample.request.params = exParams;

        const exBody = toOpenCollectionBody(example.request.body);
        if (exBody) ocExample.request.body = exBody;
      }

      if (example.response) {
        ocExample.response = {};

        if (example.response.status !== undefined) {
          ocExample.response.status = Number(example.response.status);
        }
        if (example.response.statusText) {
          ocExample.response.statusText = example.response.statusText;
        }

        const resHeaders = toOpenCollectionHeaders(example.response.headers);
        if (resHeaders) ocExample.response.headers = resHeaders;

        if (example.response.body) {
          const bodyType = example.response.body.type || 'text';
          ocExample.response.body = {
            type: bodyType,
            data: String(example.response.body.content || example.response.body || '')
          };
        }
      }

      return ocExample;
    });
  }

  return ocRequest;
};

const stringifyGraphqlRequest = (item) => {
  const request = item.request || {};

  const ocRequest = {
    type: 'graphql',
    name: item.name || 'Untitled Request',
    ...(item.seq && { seq: item.seq }),
    url: request.url || '',
    method: request.method || 'POST'
  };

  const headers = toOpenCollectionHeaders(request.headers);
  if (headers) ocRequest.headers = headers;

  const params = toOpenCollectionParams(request.params);
  if (params) ocRequest.params = params;

  if (request.body?.graphql) {
    ocRequest.body = {
      query: request.body.graphql.query || '',
      variables: request.body.graphql.variables || ''
    };
  }

  const auth = toOpenCollectionAuth(request.auth);
  if (auth) ocRequest.auth = auth;

  const scripts = toOpenCollectionScripts(request);
  if (scripts) ocRequest.scripts = scripts;

  const variables = toOpenCollectionVariables(request.vars);
  if (variables) ocRequest.variables = variables;

  const assertions = toOpenCollectionAssertions(request.assertions);
  if (assertions) ocRequest.assertions = assertions;

  if (request.docs) {
    ocRequest.docs = request.docs;
  }

  if (item.tags?.length) {
    ocRequest.tags = item.tags;
  }

  return ocRequest;
};

const stringifyGrpcRequest = (item) => {
  const request = item.request || {};

  const ocRequest = {
    type: 'grpc',
    name: item.name || 'Untitled Request',
    ...(item.seq && { seq: item.seq }),
    url: request.url || '',
    method: request.method || ''
  };

  if (request.methodType) {
    ocRequest.methodType = request.methodType;
  }

  if (request.protoPath) {
    ocRequest.protoFilePath = request.protoPath;
  }

  if (request.headers?.length) {
    ocRequest.metadata = request.headers.map((m) => ({
      name: m.name || '',
      value: m.value || '',
      ...(m.description && { description: m.description }),
      ...(m.enabled === false && { disabled: true })
    }));
  }

  if (request.body?.grpc?.length) {
    const messages = request.body.grpc;
    if (messages.length === 1) {
      ocRequest.message = messages[0].content || '';
    } else {
      ocRequest.message = messages.map((msg) => ({
        title: msg.name || 'Untitled',
        message: msg.content || '',
        ...(msg.selected && { selected: true })
      }));
    }
  }

  const auth = toOpenCollectionAuth(request.auth);
  if (auth) ocRequest.auth = auth;

  const scripts = toOpenCollectionScripts(request);
  if (scripts) ocRequest.scripts = scripts;

  const variables = toOpenCollectionVariables(request.vars);
  if (variables) ocRequest.variables = variables;

  const assertions = toOpenCollectionAssertions(request.assertions);
  if (assertions) ocRequest.assertions = assertions;

  if (request.docs) {
    ocRequest.docs = request.docs;
  }

  if (item.tags?.length) {
    ocRequest.tags = item.tags;
  }

  return ocRequest;
};

const stringifyWebsocketRequest = (item) => {
  const request = item.request || {};

  const ocRequest = {
    type: 'websocket',
    name: item.name || 'Untitled Request',
    ...(item.seq && { seq: item.seq }),
    url: request.url || ''
  };

  const headers = toOpenCollectionHeaders(request.headers);
  if (headers) ocRequest.headers = headers;

  if (request.body?.ws?.length) {
    const messages = request.body.ws;
    if (messages.length === 1) {
      ocRequest.message = {
        type: messages[0].type || 'json',
        data: messages[0].content || ''
      };
    } else {
      ocRequest.message = messages.map((msg) => ({
        title: msg.name || 'Untitled',
        message: {
          type: msg.type || 'json',
          data: msg.content || ''
        },
        ...(msg.selected && { selected: true })
      }));
    }
  }

  const auth = toOpenCollectionAuth(request.auth);
  if (auth) ocRequest.auth = auth;

  const scripts = toOpenCollectionScripts(request);
  if (scripts) ocRequest.scripts = scripts;

  const variables = toOpenCollectionVariables(request.vars);
  if (variables) ocRequest.variables = variables;

  if (request.docs) {
    ocRequest.docs = request.docs;
  }

  if (item.tags?.length) {
    ocRequest.tags = item.tags;
  }

  return ocRequest;
};

const stringifyFolder = (folder) => {
  const ocFolder = {
    type: 'folder',
    name: folder.name || 'Untitled Folder'
  };

  if (folder.seq) {
    ocFolder.seq = folder.seq;
  }

  if (folder.root) {
    const folderRequest = folder.root.request || {};

    const headers = toOpenCollectionHeaders(folderRequest.headers);
    const auth = toOpenCollectionAuth(folderRequest.auth);
    const scripts = toOpenCollectionScripts(folderRequest);
    const variables = toOpenCollectionVariables(folderRequest.vars);

    if (headers || auth || scripts || variables) {
      ocFolder.request = {};
      if (headers) ocFolder.request.headers = headers;
      if (auth) ocFolder.request.auth = auth;
      if (scripts) ocFolder.request.scripts = scripts;
      if (variables) ocFolder.request.variables = variables;
    }

    if (folder.root.docs) {
      ocFolder.docs = {
        content: folder.root.docs,
        type: 'text/markdown'
      };
    }
  }

  if (folder.tags?.length) {
    ocFolder.tags = folder.tags;
  }

  if (folder.items?.length) {
    ocFolder.items = stringifyItems(folder.items);
  }

  return ocFolder;
};

const stringifyItem = (item) => {
  switch (item.type) {
    case 'http-request':
      return stringifyHttpRequest(item);
    case 'graphql-request':
      return stringifyGraphqlRequest(item);
    case 'grpc-request':
      return stringifyGrpcRequest(item);
    case 'ws-request':
      return stringifyWebsocketRequest(item);
    case 'folder':
      return stringifyFolder(item);
    case 'js':
      return {
        type: 'script',
        script: item.fileContent || item.raw || ''
      };
    default:
      return null;
  }
};

const stringifyItems = (items) => {
  return items
    .map(stringifyItem)
    .filter(Boolean);
};

const stringifyEnvironments = (environments) => {
  if (!environments?.length) return undefined;

  return environments.map((env) => ({
    name: env.name || 'Untitled Environment',
    ...(env.color && { color: env.color }),
    ...(env.description && { description: env.description }),
    variables: (env.variables || []).map((v) => ({
      name: v.name || '',
      value: v.value || '',
      ...(v.description && { description: v.description }),
      ...(v.enabled === false && { disabled: true }),
      ...(v.secret && { transient: true })
    }))
  }));
};

const stringifyRequestDefaults = (root) => {
  if (!root?.request) return undefined;

  const request = root.request;
  const defaults = {};

  const headers = toOpenCollectionHeaders(request.headers);
  if (headers) defaults.headers = headers;

  const auth = toOpenCollectionAuth(request.auth);
  if (auth) defaults.auth = auth;

  const variables = toOpenCollectionVariables(request.vars);
  if (variables) defaults.variables = variables;

  const scripts = toOpenCollectionScripts(request);
  if (scripts) defaults.scripts = scripts;

  return Object.keys(defaults).length > 0 ? defaults : undefined;
};

const stringifyConfig = (brunoConfig) => {
  if (!brunoConfig) return undefined;

  const config = {};

  if (brunoConfig.protobuf?.protoFiles?.length || brunoConfig.protobuf?.importPaths?.length) {
    config.protobuf = {};

    if (brunoConfig.protobuf.protoFiles?.length) {
      config.protobuf.protoFiles = brunoConfig.protobuf.protoFiles.map((f) => ({
        type: 'file',
        path: f.path
      }));
    }

    if (brunoConfig.protobuf.importPaths?.length) {
      config.protobuf.importPaths = brunoConfig.protobuf.importPaths.map((p) => ({
        path: p.path,
        ...(p.disabled && { disabled: true })
      }));
    }
  }

  if (brunoConfig.proxy?.enabled) {
    if (brunoConfig.proxy.enabled === 'global') {
      config.proxy = 'inherit';
    } else {
      config.proxy = {
        protocol: brunoConfig.proxy.protocol || 'http',
        hostname: brunoConfig.proxy.hostname || '',
        port: brunoConfig.proxy.port || 0
      };

      if (brunoConfig.proxy.auth?.enabled) {
        config.proxy.auth = {
          username: brunoConfig.proxy.auth.username || '',
          password: brunoConfig.proxy.auth.password || ''
        };
      }

      if (brunoConfig.proxy.bypassProxy) {
        config.proxy.bypassProxy = brunoConfig.proxy.bypassProxy;
      }
    }
  }

  if (brunoConfig.clientCertificates?.certs?.length) {
    config.clientCertificates = brunoConfig.clientCertificates.certs
      .map((cert) => {
        if (cert.type === 'pem') {
          return {
            domain: cert.domain || '',
            type: 'pem',
            certificateFilePath: cert.certFilePath || '',
            privateKeyFilePath: cert.keyFilePath || '',
            ...(cert.passphrase && { passphrase: cert.passphrase })
          };
        } else if (cert.type === 'pkcs12') {
          return {
            domain: cert.domain || '',
            type: 'pkcs12',
            pkcs12FilePath: cert.pfxFilePath || '',
            ...(cert.passphrase && { passphrase: cert.passphrase })
          };
        }
        return null;
      })
      .filter(Boolean);
  }

  return Object.keys(config).length > 0 ? config : undefined;
};

export const stringifyBundledCollection = (collection) => {
  const openCollection = {
    info: {
      name: collection.name || 'Untitled Collection'
    },
    opencollection: '1.0.0'
  };

  const config = stringifyConfig(collection.brunoConfig);
  if (config) {
    openCollection.config = config;

    if (config.environments) {
      delete config.environments;
    }
  }

  const environments = stringifyEnvironments(collection.environments);
  if (environments?.length) {
    if (!openCollection.config) {
      openCollection.config = {};
    }
    openCollection.config.environments = environments;
  }

  const items = stringifyItems(collection.items || []);
  if (items.length) {
    openCollection.items = items;
  }

  const requestDefaults = stringifyRequestDefaults(collection.root);
  if (requestDefaults) {
    openCollection.request = requestDefaults;
  }

  if (collection.root?.docs) {
    openCollection.docs = {
      content: collection.root.docs,
      type: 'text/markdown'
    };
  }

  openCollection.bundled = true;

  const extensions = {};
  if (collection.brunoConfig?.ignore?.length) {
    extensions.ignore = collection.brunoConfig.ignore;
  }
  if (Object.keys(extensions).length > 0) {
    openCollection.extensions = extensions;
  }

  return openCollection;
};

export default stringifyBundledCollection;
