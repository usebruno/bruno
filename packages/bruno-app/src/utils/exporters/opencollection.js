import * as FileSaver from 'file-saver';
import jsyaml from 'js-yaml';

const toOpenCollectionAuth = (auth) => {
  if (!auth || auth.mode === 'none') {
    return undefined;
  }

  if (auth.mode === 'inherit') {
    return 'inherit';
  }

  switch (auth.mode) {
    case 'basic':
      return {
        type: 'basic',
        username: auth.basic?.username || '',
        password: auth.basic?.password || ''
      };
    case 'bearer':
      return {
        type: 'bearer',
        token: auth.bearer?.token || ''
      };
    case 'digest':
      return {
        type: 'digest',
        username: auth.digest?.username || '',
        password: auth.digest?.password || ''
      };
    case 'ntlm':
      return {
        type: 'ntlm',
        username: auth.ntlm?.username || '',
        password: auth.ntlm?.password || '',
        domain: auth.ntlm?.domain || ''
      };
    case 'awsv4':
      return {
        type: 'awsv4',
        accessKeyId: auth.awsv4?.accessKeyId || '',
        secretAccessKey: auth.awsv4?.secretAccessKey || '',
        sessionToken: auth.awsv4?.sessionToken || '',
        service: auth.awsv4?.service || '',
        region: auth.awsv4?.region || '',
        profileName: auth.awsv4?.profileName || ''
      };
    case 'apikey':
      return {
        type: 'apikey',
        key: auth.apikey?.key || '',
        value: auth.apikey?.value || '',
        placement: auth.apikey?.placement || 'header'
      };
    case 'wsse':
      return {
        type: 'wsse',
        username: auth.wsse?.username || '',
        password: auth.wsse?.password || ''
      };
    case 'oauth2':
      return toOpenCollectionOAuth2(auth.oauth2);
    default:
      return undefined;
  }
};

const toOpenCollectionOAuth2 = (oauth2) => {
  if (!oauth2) return undefined;

  const base = {
    type: 'oauth2'
  };

  switch (oauth2.grantType) {
    case 'client_credentials':
      return {
        ...base,
        flow: 'client_credentials',
        accessTokenUrl: oauth2.accessTokenUrl || '',
        refreshTokenUrl: oauth2.refreshTokenUrl || '',
        credentials: {
          clientId: oauth2.clientId || '',
          clientSecret: oauth2.clientSecret || '',
          placement: oauth2.credentialsPlacement === 'basic_auth_header' ? 'basic_auth_header' : 'body'
        },
        scope: oauth2.scope || '',
        tokenConfig: {
          id: oauth2.credentialsId || 'credentials',
          placement: oauth2.tokenPlacement === 'query'
            ? { query: oauth2.tokenQueryKey || 'access_token' }
            : { header: oauth2.tokenHeaderPrefix || 'Bearer' }
        },
        settings: {
          autoFetchToken: oauth2.autoFetchToken !== false,
          autoRefreshToken: oauth2.autoRefreshToken !== false
        }
      };
    case 'password':
      return {
        ...base,
        flow: 'resource_owner_password',
        accessTokenUrl: oauth2.accessTokenUrl || '',
        refreshTokenUrl: oauth2.refreshTokenUrl || '',
        credentials: {
          clientId: oauth2.clientId || '',
          clientSecret: oauth2.clientSecret || '',
          placement: oauth2.credentialsPlacement === 'basic_auth_header' ? 'basic_auth_header' : 'body'
        },
        resourceOwner: {
          username: oauth2.username || '',
          password: oauth2.password || ''
        },
        scope: oauth2.scope || '',
        tokenConfig: {
          id: oauth2.credentialsId || 'credentials',
          placement: oauth2.tokenPlacement === 'query'
            ? { query: oauth2.tokenQueryKey || 'access_token' }
            : { header: oauth2.tokenHeaderPrefix || 'Bearer' }
        },
        settings: {
          autoFetchToken: oauth2.autoFetchToken !== false,
          autoRefreshToken: oauth2.autoRefreshToken !== false
        }
      };
    case 'authorization_code':
      return {
        ...base,
        flow: 'authorization_code',
        authorizationUrl: oauth2.authorizationUrl || '',
        accessTokenUrl: oauth2.accessTokenUrl || '',
        refreshTokenUrl: oauth2.refreshTokenUrl || '',
        callbackUrl: oauth2.callbackUrl || '',
        credentials: {
          clientId: oauth2.clientId || '',
          clientSecret: oauth2.clientSecret || '',
          placement: oauth2.credentialsPlacement === 'basic_auth_header' ? 'basic_auth_header' : 'body'
        },
        scope: oauth2.scope || '',
        pkce: oauth2.pkce ? { enabled: true, method: 'S256' } : undefined,
        tokenConfig: {
          id: oauth2.credentialsId || 'credentials',
          placement: oauth2.tokenPlacement === 'query'
            ? { query: oauth2.tokenQueryKey || 'access_token' }
            : { header: oauth2.tokenHeaderPrefix || 'Bearer' }
        },
        settings: {
          autoFetchToken: oauth2.autoFetchToken !== false,
          autoRefreshToken: oauth2.autoRefreshToken !== false
        }
      };
    case 'implicit':
      return {
        ...base,
        flow: 'implicit',
        authorizationUrl: oauth2.authorizationUrl || '',
        callbackUrl: oauth2.callbackUrl || '',
        credentials: {
          clientId: oauth2.clientId || ''
        },
        scope: oauth2.scope || '',
        state: oauth2.state || '',
        tokenConfig: {
          id: oauth2.credentialsId || 'credentials',
          placement: oauth2.tokenPlacement === 'query'
            ? { query: oauth2.tokenQueryKey || 'access_token' }
            : { header: oauth2.tokenHeaderPrefix || 'Bearer' }
        },
        settings: {
          autoFetchToken: oauth2.autoFetchToken !== false
        }
      };
    default:
      return undefined;
  }
};

const toOpenCollectionHeaders = (headers) => {
  if (!headers?.length) return undefined;

  return headers.map((header) => ({
    name: header.name || '',
    value: header.value || '',
    ...(header.description && { description: header.description }),
    ...(header.enabled === false && { disabled: true })
  }));
};

const toOpenCollectionParams = (params) => {
  if (!params?.length) return undefined;

  return params.map((param) => ({
    name: param.name || '',
    value: param.value || '',
    type: param.type || 'query',
    ...(param.description && { description: param.description }),
    ...(param.enabled === false && { disabled: true })
  }));
};

const toOpenCollectionBody = (body) => {
  if (!body || body.mode === 'none') return undefined;

  switch (body.mode) {
    case 'json':
      return { type: 'json', data: body.json || '' };
    case 'text':
      return { type: 'text', data: body.text || '' };
    case 'xml':
      return { type: 'xml', data: body.xml || '' };
    case 'sparql':
      return { type: 'sparql', data: body.sparql || '' };
    case 'formUrlEncoded':
      return {
        type: 'form-urlencoded',
        data: (body.formUrlEncoded || []).map((field) => ({
          name: field.name || '',
          value: field.value || '',
          ...(field.description && { description: field.description }),
          ...(field.enabled === false && { disabled: true })
        }))
      };
    case 'multipartForm':
      return {
        type: 'multipart-form',
        data: (body.multipartForm || []).map((field) => ({
          name: field.name || '',
          type: field.type || 'text',
          value: field.value || '',
          ...(field.description && { description: field.description }),
          ...(field.enabled === false && { disabled: true })
        }))
      };
    case 'file':
      return {
        type: 'file',
        data: (body.file || []).map((file) => ({
          filePath: file.filePath || '',
          contentType: file.contentType || '',
          selected: file.selected !== false
        }))
      };
    case 'graphql':
      return {
        query: body.graphql?.query || '',
        variables: body.graphql?.variables || ''
      };
    default:
      return undefined;
  }
};

const toOpenCollectionVariables = (vars) => {
  const reqVars = vars?.req || [];
  if (!reqVars.length) return undefined;

  return reqVars.map((v) => ({
    name: v.name || '',
    value: v.value || '',
    ...(v.description && { description: v.description }),
    ...(v.enabled === false && { disabled: true })
  }));
};

const toOpenCollectionScripts = (request) => {
  const scripts = {};

  if (request?.script?.req) {
    scripts.preRequest = request.script.req;
  }
  if (request?.script?.res) {
    scripts.postResponse = request.script.res;
  }
  if (request?.tests) {
    scripts.tests = request.tests;
  }

  return Object.keys(scripts).length > 0 ? scripts : undefined;
};

const toOpenCollectionAssertions = (assertions) => {
  if (!assertions?.length) return undefined;

  return assertions.map((a) => ({
    expression: a.name || '',
    operator: a.operator || 'eq',
    value: a.value || '',
    ...(a.enabled === false && { disabled: true }),
    ...(a.description && { description: a.description })
  }));
};

const toOpenCollectionGrpcMetadata = (metadata) => {
  if (!metadata?.length) return undefined;

  return metadata.map((m) => ({
    name: m.name || '',
    value: m.value || '',
    ...(m.description && { description: m.description }),
    ...(m.enabled === false && { disabled: true })
  }));
};

const transformHttpRequest = (item) => {
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

const transformGraphqlRequest = (item) => {
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

const transformGrpcRequest = (item) => {
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

  const metadata = toOpenCollectionGrpcMetadata(request.headers);
  if (metadata) ocRequest.metadata = metadata;

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

const transformWebsocketRequest = (item) => {
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

const transformItem = (item) => {
  switch (item.type) {
    case 'http-request':
      return transformHttpRequest(item);
    case 'graphql-request':
      return transformGraphqlRequest(item);
    case 'grpc-request':
      return transformGrpcRequest(item);
    case 'ws-request':
      return transformWebsocketRequest(item);
    case 'folder':
      return transformFolder(item);
    case 'js':
      return {
        type: 'script',
        script: item.fileContent || item.raw || ''
      };
    default:
      return null;
  }
};

const transformFolder = (folder) => {
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
    ocFolder.items = folder.items
      .map(transformItem)
      .filter(Boolean);
  }

  return ocFolder;
};

const transformItems = (items) => {
  return items
    .map(transformItem)
    .filter(Boolean);
};

const transformEnvironments = (environments) => {
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

const transformRequestDefaults = (root) => {
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

const transformConfig = (brunoConfig) => {
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

export const brunoToOpenCollection = (collection) => {
  const openCollection = {
    info: {
      name: collection.name || 'Untitled Collection'
    },
    opencollection: '1.0.0'
  };

  const config = transformConfig(collection.brunoConfig);
  if (config) {
    openCollection.config = config;

    if (config.environments) {
      delete config.environments;
    }
  }

  const environments = transformEnvironments(collection.environments);
  if (environments?.length) {
    if (!openCollection.config) {
      openCollection.config = {};
    }
    openCollection.config.environments = environments;
  }

  const items = transformItems(collection.items || []);
  if (items.length) {
    openCollection.items = items;
  }

  const requestDefaults = transformRequestDefaults(collection.root);
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

export const exportCollection = (collection) => {
  const openCollection = brunoToOpenCollection(collection);

  const yamlContent = jsyaml.dump(openCollection, {
    indent: 2,
    lineWidth: -1,
    noRefs: true,
    sortKeys: false
  });

  const fileName = `${collection.name}.yml`;
  const fileBlob = new Blob([yamlContent], { type: 'application/x-yaml' });

  FileSaver.saveAs(fileBlob, fileName);
};

export default exportCollection;
