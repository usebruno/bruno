import { get, each, filter, find } from 'lodash';
import decomment from 'decomment';
import { setAuthHeaders, PreparedAuthRequest } from './set-auth-headers';

export interface RequestHeader {
  name: string;
  value: string;
  enabled?: boolean;
}

export interface RequestParam {
  name: string;
  value: string;
  type?: 'path' | 'query';
  enabled?: boolean;
}

export interface RequestBodyFile {
  filePath?: string;
  contentType?: string;
  selected?: boolean;
}

export interface FormParam {
  name: string;
  value: string;
  enabled?: boolean;
  type?: string;
  filePath?: string;
  contentType?: string;
}

export interface RequestBody {
  mode?: string;
  json?: string;
  text?: string;
  xml?: string;
  sparql?: string;
  file?: RequestBodyFile[];
  formUrlEncoded?: FormParam[];
  multipartForm?: FormParam[];
  graphql?: {
    query?: string;
    variables?: string;
  };
}

export interface RequestAuth {
  mode?: string;
  awsv4?: any;
  basic?: any;
  bearer?: any;
  digest?: any;
  ntlm?: any;
  wsse?: any;
  apikey?: any;
  oauth2?: any;
}

export interface BrunoRequest {
  url: string;
  method: string;
  headers?: RequestHeader[];
  params?: RequestParam[];
  body?: RequestBody;
  auth?: RequestAuth;
  script?: any;
  tests?: any;
  vars?: any;
  assertions?: any;
  collectionVariables?: Record<string, any>;
  folderVariables?: Record<string, any>;
  requestVariables?: Record<string, any>;
  globalEnvironmentVariables?: Record<string, any>;
  oauth2CredentialVariables?: Record<string, any>;
  promptVariables?: Record<string, any>;
  oauth2Credentials?: any;
}

export interface CollectionRoot {
  request?: {
    headers?: RequestHeader[];
    auth?: RequestAuth;
  };
}

export interface PrepareRequestItem {
  name?: string;
  uid?: string;
  tags?: string[];
  settings?: any;
  draft?: {
    request?: BrunoRequest;
    settings?: any;
  };
  request?: BrunoRequest;
}

export interface PrepareRequestCollection {
  pathname?: string;
  brunoConfig?: {
    scripts?: {
      flow?: string;
    };
  };
  draft?: {
    root?: CollectionRoot;
    brunoConfig?: any;
  };
  root?: CollectionRoot;
  globalEnvironmentVariables?: Record<string, any>;
  oauth2Credentials?: any;
  promptVariables?: Record<string, any>;
}

export interface FileHandler {
  readFileSync: (filePath: string) => Buffer;
  createReadStream: (filePath: string) => any;
  isLargeFile: (filePath: string, threshold: number) => boolean;
  resolvePath: (collectionPath: string, filePath: string) => string;
  isAbsolute: (filePath: string) => boolean;
}

export interface CollectionMergeUtils {
  getTreePathFromCollectionToItem: (collection: any, item: any) => any[] | null;
  mergeHeaders: (collection: any, request: any, requestTreePath: any[]) => void;
  mergeScripts: (collection: any, request: any, requestTreePath: any[], scriptFlow: string) => void;
  mergeVars: (collection: any, request: any, requestTreePath: any[]) => void;
  mergeAuth: (collection: any, request: any, requestTreePath: any[]) => void;
  getFormattedOauth2Credentials?: (options?: any) => Record<string, any>;
}

export interface PrepareRequestOptions {
  item: PrepareRequestItem;
  collection?: PrepareRequestCollection;
  fileHandler?: FileHandler;
  collectionUtils?: CollectionMergeUtils;
  streamingThreshold?: number;
}

export interface PreparedRequest extends PreparedAuthRequest {
  mode?: string;
  method: string;
  url: string;
  name?: string;
  tags?: string[];
  pathParams?: RequestParam[];
  settings?: any;
  responseType?: string;
  data?: any;
  script?: any;
  tests?: any;
  vars?: any;
  assertions?: any;
  collectionVariables?: Record<string, any>;
  folderVariables?: Record<string, any>;
  requestVariables?: Record<string, any>;
  globalEnvironmentVariables?: Record<string, any>;
  oauth2CredentialVariables?: Record<string, any>;
  promptVariables?: Record<string, any>;
  oauth2Credentials?: any;
}

const DEFAULT_STREAMING_THRESHOLD = 20 * 1024 * 1024; // 20MB

export const prepareRequest = async (options: PrepareRequestOptions): Promise<PreparedRequest> => {
  const {
    item,
    collection = {},
    fileHandler,
    collectionUtils,
    streamingThreshold = DEFAULT_STREAMING_THRESHOLD
  } = options;

  const request = item.draft?.request ?? item.request;
  if (!request) {
    throw new Error('Request is required');
  }

  const settings = item.draft?.settings ?? item.settings;
  const collectionRoot = collection?.draft?.root ?? collection?.root ?? {};
  const collectionPath = collection?.pathname ?? '';
  const headers: Record<string, any> = {};
  let contentTypeDefined = false;

  each(get(collectionRoot, 'request.headers', []), (h: RequestHeader) => {
    if (h.enabled && h.name?.toLowerCase() === 'content-type') {
      contentTypeDefined = true;
      return false;
    }
  });

  const scriptFlow = collection?.brunoConfig?.scripts?.flow ?? 'sandwich';

  if (collectionUtils) {
    const requestTreePath = collectionUtils.getTreePathFromCollectionToItem(collection, item);
    if (requestTreePath && requestTreePath.length > 0) {
      collectionUtils.mergeHeaders(collection, request, requestTreePath);
      collectionUtils.mergeScripts(collection, request, requestTreePath, scriptFlow);
      collectionUtils.mergeVars(collection, request, requestTreePath);
      collectionUtils.mergeAuth(collection, request, requestTreePath);
      (request as any).globalEnvironmentVariables = collection?.globalEnvironmentVariables;
      if (collectionUtils.getFormattedOauth2Credentials) {
        (request as any).oauth2CredentialVariables = collectionUtils.getFormattedOauth2Credentials({ oauth2Credentials: collection?.oauth2Credentials });
      }
      (request as any).promptVariables = collection?.promptVariables || {};
    }
  }

  each(get(request, 'headers', []), (h: RequestHeader) => {
    if (h.enabled && h.name && h.name.length > 0) {
      headers[h.name] = h.value;
      if (h.name.toLowerCase() === 'content-type') {
        contentTypeDefined = true;
      }
    }
  });

  let axiosRequest: PreparedRequest = {
    mode: request.body?.mode,
    method: request.method,
    url: request.url,
    headers,
    name: item.name,
    tags: item.tags || [],
    pathParams: request.params?.filter((param) => param.type === 'path'),
    settings,
    responseType: 'arraybuffer'
  };

  axiosRequest = setAuthHeaders(axiosRequest, {
    request: { auth: request.auth },
    collectionRoot
  });

  const body = request.body || {};

  if (body.mode === 'json') {
    if (!contentTypeDefined) {
      axiosRequest.headers['content-type'] = 'application/json';
    }
    try {
      axiosRequest.data = decomment(body.json || '');
    } catch {
      axiosRequest.data = body.json;
    }
  }

  if (body.mode === 'text') {
    if (!contentTypeDefined) {
      axiosRequest.headers['content-type'] = 'text/plain';
    }
    axiosRequest.data = body.text;
  }

  if (body.mode === 'xml') {
    if (!contentTypeDefined) {
      axiosRequest.headers['content-type'] = 'application/xml';
    }
    axiosRequest.data = body.xml;
  }

  if (body.mode === 'sparql') {
    if (!contentTypeDefined) {
      axiosRequest.headers['content-type'] = 'application/sparql-query';
    }
    axiosRequest.data = body.sparql;
  }

  if (body.mode === 'file' && fileHandler) {
    if (!contentTypeDefined) {
      axiosRequest.headers['content-type'] = 'application/octet-stream';
    }

    const bodyFile = find(body.file, (param) => param.selected);
    if (bodyFile) {
      let { filePath, contentType } = bodyFile;

      if (contentType) {
        axiosRequest.headers['content-type'] = contentType;
      }

      if (filePath) {
        if (!fileHandler.isAbsolute(filePath)) {
          filePath = fileHandler.resolvePath(collectionPath, filePath);
        }

        try {
          if (fileHandler.isLargeFile(filePath, streamingThreshold)) {
            axiosRequest.data = fileHandler.createReadStream(filePath);
          } else {
            axiosRequest.data = fileHandler.readFileSync(filePath);
          }
        } catch (error) {
          console.error('Error reading file:', error);
        }
      }
    }
  }

  if (body.mode === 'formUrlEncoded') {
    if (!contentTypeDefined) {
      axiosRequest.headers['content-type'] = 'application/x-www-form-urlencoded';
    }
    const enabledParams = filter(body.formUrlEncoded, (p: FormParam) => p.enabled);
    axiosRequest.data = enabledParams;
  }

  if (body.mode === 'multipartForm') {
    if (!contentTypeDefined) {
      axiosRequest.headers['content-type'] = 'multipart/form-data';
    }
    const enabledParams = filter(body.multipartForm, (p: FormParam) => p.enabled);
    axiosRequest.data = enabledParams;
  }

  if (body.mode === 'graphql') {
    const graphqlQuery = {
      query: get(body, 'graphql.query'),
      variables: decomment(get(body, 'graphql.variables') || '{}')
    };
    if (!contentTypeDefined) {
      axiosRequest.headers['content-type'] = 'application/json';
    }
    axiosRequest.data = graphqlQuery;
  }

  if (body.mode === 'none' && request.auth?.mode !== 'awsv4') {
    if (!contentTypeDefined) {
      axiosRequest.headers['content-type'] = false;
    }
  }

  if (request.script) {
    axiosRequest.script = request.script;
  }

  if (request.tests) {
    axiosRequest.tests = request.tests;
  }

  axiosRequest.vars = request.vars;
  axiosRequest.assertions = request.assertions;
  axiosRequest.collectionVariables = request.collectionVariables;
  axiosRequest.folderVariables = request.folderVariables;
  axiosRequest.requestVariables = request.requestVariables;
  axiosRequest.globalEnvironmentVariables = (request as any).globalEnvironmentVariables;
  axiosRequest.oauth2CredentialVariables = (request as any).oauth2CredentialVariables;
  axiosRequest.promptVariables = (request as any).promptVariables;
  axiosRequest.oauth2Credentials = request.oauth2Credentials;

  return axiosRequest;
};
