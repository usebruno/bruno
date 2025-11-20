import * as _ from 'lodash';
import * as YAML from 'yaml';
import Ajv from 'ajv';
import openCollectionSchema from './schema/opencollection.schema.json';

interface OpenCollectionRequest {
  type: 'http' | 'graphql' | 'grpc' | 'ws';
  name: string;
  url?: string;
  method?: string;
  params?: any[];
  headers?: any[];
  metadata?: any[];
  body?: any;
  message?: any;
  auth?: any;
  variables?: any[];
  scripts?: any;
  assertions?: any[];
  docs?: string;
  tags?: string[];
  [key: string]: any;
}

const TYPE_MAP_OC_TO_BRUNO: Record<string, string> = {
  http: 'http-request',
  graphql: 'graphql-request',
  grpc: 'grpc-request',
  ws: 'ws-request'
};

const TYPE_MAP_BRUNO_TO_OC: Record<string, string> = {
  'http-request': 'http',
  'graphql-request': 'graphql',
  'grpc-request': 'grpc',
  'ws-request': 'ws'
};

let ajv: Ajv | null = null;
let validateRequest: any = null;

const initializeValidator = (): void => {
  if (!ajv) {
    ajv = new Ajv({ strict: false, allErrors: true, verbose: true });
    try {
      validateRequest = ajv.compile(openCollectionSchema);
    } catch (error) {
      console.warn('[YAML] Failed to compile OpenCollection schema:', error);
      validateRequest = null;
    }
  }
};

/**
 * Validate YAML structure against OpenCollection schema
 */
const validateYamlStructure = (yaml: any, context: string = 'request'): boolean => {
  if (!validateRequest) {
    return true;
  }

  const valid = validateRequest(yaml);
  if (!valid && validateRequest.errors) {
    const errors = validateRequest.errors.map((err: any) => ({
      path: err.instancePath || 'root',
      message: err.message,
      params: err.params
    }));
    console.warn(`[YAML] OpenCollection validation failed for ${context}:`, errors);
    return false;
  }
  return true;
};

/**
 * Helper to clean false boolean values from an object
 * Only keeps boolean fields that are true
 */
/**
 * Clean false booleans and empty strings from an object using JSON serialization
 * This ensures we don't corrupt the object structure
 */
const cleanFalseBooleans = (obj: any): any => {
  const cleaned = JSON.parse(JSON.stringify(obj, (key, value) => {
    if (value === null || value === undefined) {
      return value;
    }

    if (value === false || value === '') {
      return undefined;
    }

    return value;
  }));

  const removeEmpty = (obj: any): any => {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (Array.isArray(obj)) {
      const filtered = obj.map(removeEmpty).filter((item) => {
        if (item === null || item === undefined) return true;
        if (typeof item !== 'object') return true;
        if (Array.isArray(item)) return item.length > 0;
        return Object.keys(item).length > 0;
      });
      return filtered;
    }

    if (typeof obj === 'object') {
      const result: any = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          const value = removeEmpty(obj[key]);

          if (value !== undefined && value !== null) {
            if (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0) {
              continue;
            }
            if (Array.isArray(value) && value.length === 0) {
              continue;
            }
            result[key] = value;
          }
        }
      }
      return result;
    }

    return obj;
  };

  return removeEmpty(cleaned);
};

/**
 * Common helper: Map array items with enabled/disabled field conversion
 */
const mapArrayWithEnabledField = (items: any[], defaultEnabled: boolean = true): any[] => {
  if (!Array.isArray(items)) return [];

  return items.map((item: any) => ({
    ...item,
    enabled: item.disabled !== undefined ? !item.disabled : (item.enabled !== false)
  }));
};

/**
 * Common helper: Map array items with disabled field conversion
 * Also filters out internal Bruno fields like 'uid' and unsupported fields like 'description'
 * Only adds boolean fields when they are true (omits false/default values)
 */
const mapArrayWithDisabledField = (items: any[]): any[] => {
  if (!Array.isArray(items)) return [];

  return items.map((item: any) => {
    const { enabled, uid, description, ...rest } = item;

    // Only add disabled: true when actually disabled (enabled === false)
    if (enabled === false) {
      rest.disabled = true;
    }

    // Clean up false boolean values
    return cleanFalseBooleans(rest);
  });
};

/**
 * Parse authentication following OpenCollection Auth schema
 */
const parseAuth = (authSection: any): any => {
  if (!authSection || _.isEmpty(authSection)) {
    return { mode: 'none' };
  }

  const authType = _.get(authSection, 'type', 'none');

  if (authType === 'inherit' || authType === 'none') {
    return { mode: authType };
  }

  const auth: any = { mode: authType };

  Object.keys(authSection).forEach((key) => {
    if (key !== 'type') {
      auth[key] = authSection[key];
    }
  });

  return auth;
};

/**
 * Serialize authentication to OpenCollection format
 */
const serializeAuth = (auth: any): any => {
  if (!auth || auth.mode === 'none') {
    return undefined;
  }

  const authObj: any = {
    type: auth.mode
  };

  Object.keys(auth).forEach((key) => {
    if (key !== 'mode') {
      authObj[key] = auth[key];
    }
  });

  return authObj;
};

/**
 * Parse HTTP body following OpenCollection HttpRequestBody schema
 */
const parseHttpBody = (bodySection: any): any => {
  if (!bodySection || _.isEmpty(bodySection)) {
    return { mode: 'none' };
  }

  // RawBody format (type + data)
  if (bodySection.type && bodySection.data) {
    const bodyType = bodySection.type;
    const body: any = { mode: bodyType };

    if (bodyType === 'json') {
      body.json = bodySection.data;
    } else if (['text', 'xml', 'sparql'].includes(bodyType)) {
      body[bodyType] = bodySection.data;
    }

    return body;
  }

  // FormUrlEncodedBody or MultipartFormBody (array)
  if (Array.isArray(bodySection) && bodySection.length > 0) {
    const hasFileType = bodySection.some((item: any) => item.type === 'file');

    if (hasFileType) {
      return {
        mode: 'multipartForm',
        multipartForm: mapArrayWithEnabledField(bodySection)
      };
    } else {
      return {
        mode: 'formUrlEncoded',
        formUrlEncoded: mapArrayWithEnabledField(bodySection)
      };
    }
  }

  return { mode: 'none' };
};

/**
 * Serialize HTTP body to OpenCollection format
 */
const serializeHttpBody = (body: any): any => {
  const bodyMode = _.get(body, 'mode');

  if (!bodyMode || bodyMode === 'none') {
    return undefined;
  }

  // RawBody format
  if (['json', 'text', 'xml', 'sparql'].includes(bodyMode)) {
    const data = _.get(body, bodyMode, '');
    if (!data) return undefined;

    return {
      type: bodyMode,
      data
    };
  }

  // FormUrlEncodedBody
  if (bodyMode === 'formUrlEncoded') {
    const formData = _.get(body, 'formUrlEncoded', []);
    return formData.length > 0 ? mapArrayWithDisabledField(formData) : undefined;
  }

  // MultipartFormBody
  if (bodyMode === 'multipartForm') {
    const formData = _.get(body, 'multipartForm', []);
    return formData.length > 0 ? mapArrayWithDisabledField(formData) : undefined;
  }

  return undefined;
};

/**
 * Parse GraphQL body following OpenCollection GraphQLBody schema
 */
const parseGraphQLBody = (bodySection: any): any => {
  if (!bodySection || _.isEmpty(bodySection)) {
    return { mode: 'none' };
  }

  return {
    mode: 'graphql',
    graphql: {
      query: _.get(bodySection, 'query', ''),
      variables: _.get(bodySection, 'variables', '')
    }
  };
};

/**
 * Parse gRPC message following OpenCollection GrpcMessage schema
 */
const parseGrpcMessage = (messageSection: any): any => {
  if (!messageSection) {
    return {
      mode: 'grpc',
      grpc: [{ name: 'message 1', content: '{}' }]
    };
  }

  // Single message string
  if (typeof messageSection === 'string') {
    return {
      mode: 'grpc',
      grpc: [{ name: 'message 1', content: messageSection }]
    };
  }

  // Array of message variants
  if (Array.isArray(messageSection)) {
    return {
      mode: 'grpc',
      grpc: messageSection.map((msg: any, index: number) => ({
        name: msg.title || `message ${index + 1}`,
        content: msg.message || msg.content || '{}'
      }))
    };
  }

  return {
    mode: 'grpc',
    grpc: [{ name: 'message 1', content: '{}' }]
  };
};

/**
 * Parse WebSocket message following OpenCollection WebSocketMessage schema
 */
const parseWebSocketMessage = (messageSection: any): any => {
  if (!messageSection) {
    return {
      mode: 'ws',
      ws: [{ name: 'message 1', type: 'json', content: '{}' }]
    };
  }

  // Single message object
  if (messageSection.type && messageSection.data) {
    return {
      mode: 'ws',
      ws: [{
        name: 'message 1',
        type: messageSection.type,
        content: messageSection.data
      }]
    };
  }

  // Array of message variants
  if (Array.isArray(messageSection)) {
    return {
      mode: 'ws',
      ws: messageSection.map((msg: any, index: number) => ({
        name: msg.title || `message ${index + 1}`,
        type: msg.message?.type || msg.type || 'json',
        content: msg.message?.data || msg.data || '{}'
      }))
    };
  }

  return {
    mode: 'ws',
    ws: [{ name: 'message 1', type: 'json', content: '{}' }]
  };
};

/**
 * Parse examples from OpenCollection format to Bruno internal format
 */
const parseExamples = (examples: any[], internalType: string): any[] => {
  if (!Array.isArray(examples) || examples.length === 0) return [];

  return examples.map((example: any) => ({
    uid: '',
    name: example.name || 'Example',
    description: example.description || '',
    type: internalType,
    request: {
      url: example.request?.url || '',
      method: _.upperCase(example.request?.method || 'GET'),
      headers: mapArrayWithEnabledField(example.request?.headers || []),
      params: mapArrayWithEnabledField(example.request?.params || []),
      body: parseHttpBody(example.request?.body || null)
    },
    response: {
      status: String(example.response?.status || ''),
      statusText: String(example.response?.statusText || ''),
      headers: mapArrayWithEnabledField(example.response?.headers || []),
      body: {
        type: example.response?.body?.type || 'json',
        content: example.response?.body?.data || ''
      }
    }
  }));
};

/**
 * Convert YAML request to Bruno's internal JSON format
 * Follows OpenCollection schema with FLAT structure
 */
export const yamlRequestToJson = (data: string | any, parsed: boolean = false): any => {
  try {
    const yaml: OpenCollectionRequest = parsed ? data : YAML.parse(data);

    validateYamlStructure(yaml, `request: ${yaml.name || 'unnamed'}`);

    const requestType = yaml.type || 'http';
    const internalType = TYPE_MAP_OC_TO_BRUNO[requestType] || 'http-request';

    const transformedJson: any = {
      type: internalType,
      name: yaml.name || '',
      seq: yaml.seq !== undefined ? (!isNaN(yaml.seq) ? Number(yaml.seq) : 1) : (yaml.meta?.seq !== undefined ? Number(yaml.meta.seq) : 1),
      tags: yaml.tags || [],
      request: {
        url: yaml.url || '',
        method: _.upperCase(yaml.method || 'GET'),
        params: [],
        headers: [],
        auth: { mode: 'none' },
        body: { mode: 'none' } as any,
        script: {},
        vars: {},
        assertions: yaml.assertions || [],
        tests: '',
        docs: yaml.docs || ''
      },
      settings: {}
    };

    if (Array.isArray(yaml.params)) {
      transformedJson.request.params = yaml.params.map((param: any) => ({
        name: param.name,
        value: param.value || '',
        type: param.type || 'query',
        enabled: param.enabled !== false,
        ...(param.description && { description: param.description })
      }));
    }

    const headerSource = internalType === 'grpc-request' ? yaml.metadata : yaml.headers;
    if (Array.isArray(headerSource)) {
      transformedJson.request.headers = mapArrayWithEnabledField(headerSource);
    }

    transformedJson.request.auth = parseAuth(yaml.auth);

    if (internalType === 'http-request') {
      transformedJson.request.body = parseHttpBody(yaml.body);
    } else if (internalType === 'graphql-request') {
      transformedJson.request.body = parseGraphQLBody(yaml.body);
    } else if (internalType === 'grpc-request') {
      transformedJson.request.body = parseGrpcMessage(yaml.message);
    } else if (internalType === 'ws-request') {
      transformedJson.request.body = parseWebSocketMessage(yaml.message);
    }

    if (Array.isArray(yaml.variables)) {
      const reqVars = yaml.variables.map((v: any) => ({
        name: v.name,
        value: typeof v.value === 'string' ? v.value : (v.value?.data || ''),
        enabled: !v.disabled,
        ...(v.description && { description: v.description })
      }));

      transformedJson.request.vars = {
        req: reqVars,
        res: []
      };
    } else {
      transformedJson.request.vars = { req: [], res: [] };
    }

    if (yaml.scripts) {
      transformedJson.request.script = {
        req: yaml.scripts.preRequest || '',
        res: yaml.scripts.postResponse || ''
      };
      transformedJson.request.tests = yaml.scripts.tests || '';
    } else {
      transformedJson.request.script = { req: '', res: '' };
    }

    const settingsKeys = ['encodeUrl', 'timeout', 'followRedirects', 'maxRedirects'];
    const extractedSettings: any = {};
    settingsKeys.forEach((key) => {
      if (yaml[key] !== undefined) {
        extractedSettings[key] = yaml[key];
      }
    });

    if (Object.keys(extractedSettings).length > 0) {
      transformedJson.settings = { [requestType]: extractedSettings };
    }

    if (internalType === 'http-request' && Array.isArray(yaml.examples)) {
      transformedJson.examples = parseExamples(yaml.examples, internalType);
    }

    return transformedJson;
  } catch (e) {
    console.error('Error parsing YAML request:', e);
    return Promise.reject(e);
  }
};

const serializeExamples = (examples: any[]): any[] => {
  if (!Array.isArray(examples) || examples.length === 0) return [];

  return examples.map((example: any) => {
    const serialized: any = {
      name: example.name || 'Example'
    };

    if (example.description) {
      serialized.description = example.description;
    }

    serialized.request = {
      url: example.request?.url || '',
      method: _.lowerCase(example.request?.method || 'get')
    };

    if (example.request?.headers && example.request.headers.length > 0) {
      serialized.request.headers = mapArrayWithDisabledField(example.request.headers);
    }

    if (example.request?.params && example.request.params.length > 0) {
      serialized.request.params = mapArrayWithDisabledField(example.request.params);
    }

    if (example.request?.body) {
      const bodyContent = serializeHttpBody(example.request.body);
      if (bodyContent) {
        serialized.request.body = bodyContent;
      }
    }

    serialized.response = {};

    if (example.response?.status) {
      serialized.response.status = parseInt(example.response.status) || 200;
    }

    if (example.response?.statusText) {
      serialized.response.statusText = example.response.statusText;
    }

    if (example.response?.headers && example.response.headers.length > 0) {
      serialized.response.headers = mapArrayWithDisabledField(example.response.headers);
    }

    if (example.response?.body) {
      serialized.response.body = {
        type: example.response.body.type || 'json',
        data: example.response.body.content || ''
      };
    }

    return serialized;
  });
};

export const jsonRequestToYaml = (json: any): string => {
  try {
    const type = json.type;
    const ocType = TYPE_MAP_BRUNO_TO_OC[type] || 'http';

    const yamlObj: any = {
      type: ocType,
      name: json.name || '',
      url: json.request?.url || '',
      method: _.lowerCase(json.request?.method || 'get')
    };

    if (json.seq !== undefined) {
      yamlObj.seq = json.seq;
    } else if (json.meta?.seq !== undefined) {
      yamlObj.seq = json.meta.seq;
    }

    if (json.tags && json.tags.length > 0) {
      yamlObj.tags = json.tags;
    }

    if (json.request?.params && json.request.params.length > 0) {
      yamlObj.params = json.request.params.map((param: any) => {
        const paramObj: any = {
          name: param.name,
          value: param.value,
          type: param.type || 'query'
        };

        if (param.enabled === false) {
          paramObj.disabled = true;
        }

        if (param.description) {
          paramObj.description = param.description;
        }

        return cleanFalseBooleans(paramObj);
      });
    }

    if (json.request?.headers && json.request.headers.length > 0) {
      const headerKey = ocType === 'grpc' ? 'metadata' : 'headers';
      yamlObj[headerKey] = mapArrayWithDisabledField(json.request.headers);
    }

    let bodyContent;
    if (ocType === 'http') {
      bodyContent = serializeHttpBody(json.request?.body);
    } else if (ocType === 'graphql' && json.request?.body?.mode === 'graphql') {
      bodyContent = {
        query: json.request.body.graphql?.query || '',
        variables: json.request.body.graphql?.variables || ''
      };
    } else if (ocType === 'grpc') {
      const grpcMessages = json.request?.body?.grpc || [];
      if (grpcMessages.length === 1) {
        bodyContent = grpcMessages[0].content;
      } else if (grpcMessages.length > 1) {
        bodyContent = grpcMessages.map((msg: any) => ({
          title: msg.name,
          message: msg.content
        }));
      }
    } else if (ocType === 'ws') {
      const wsMessages = json.request?.body?.ws || [];
      if (wsMessages.length === 1) {
        bodyContent = {
          type: wsMessages[0].type || 'json',
          data: wsMessages[0].content
        };
      } else if (wsMessages.length > 1) {
        bodyContent = wsMessages.map((msg: any) => ({
          title: msg.name,
          message: {
            type: msg.type || 'json',
            data: msg.content
          }
        }));
      }
    }

    if (bodyContent) {
      if (ocType === 'grpc') {
        yamlObj.message = bodyContent;
      } else if (ocType === 'ws') {
        yamlObj.message = bodyContent;
      } else {
        yamlObj.body = bodyContent;
      }
    }

    const authContent = serializeAuth(json.request?.auth);
    if (authContent) {
      yamlObj.auth = authContent;
    }

    const reqVars = json.request?.vars?.req || [];
    const resVars = json.request?.vars?.res || [];
    const allVars = [...reqVars, ...resVars];

    if (allVars.length > 0) {
      yamlObj.variables = mapArrayWithDisabledField(allVars);
    }

    const reqScript = json.request?.script?.req || '';
    const resScript = json.request?.script?.res || '';
    const tests = json.request?.tests || '';

    if (reqScript || resScript || tests) {
      yamlObj.scripts = {};
      if (reqScript) yamlObj.scripts.preRequest = reqScript;
      if (resScript) yamlObj.scripts.postResponse = resScript;
      if (tests) yamlObj.scripts.tests = tests;
    }

    if (json.request?.assertions && json.request.assertions.length > 0) {
      yamlObj.assertions = json.request.assertions;
    }

    if (json.request?.docs) {
      yamlObj.docs = json.request.docs;
    }

    const settings = json.settings || {};
    const typeSettings = settings[ocType] || settings.http || {};
    Object.keys(typeSettings).forEach((key) => {
      yamlObj[key] = typeSettings[key];
    });

    if (json.type === 'http-request' && json.examples && json.examples.length > 0) {
      yamlObj.examples = serializeExamples(json.examples);
    }

    const cleanedJson = cleanFalseBooleans(yamlObj);

    validateYamlStructure(cleanedJson, `output: ${cleanedJson.name}`);

    return YAML.stringify(cleanedJson, {
      lineWidth: 0,
      indent: 2,
      minContentWidth: 0,
      defaultStringType: 'PLAIN'
    });
  } catch (error) {
    console.error('Error converting to YAML:', error);
    throw error;
  }
};

export const yamlFolderToJson = (data: string | any, parsed: boolean = false): any => {
  try {
    const yaml = parsed ? data : YAML.parse(data);

    const transformedJson: any = {
      meta: {
        name: yaml.name || yaml.meta?.name || 'Untitled Folder'
      }
    };

    if (yaml.seq !== undefined) {
      transformedJson.meta.seq = !isNaN(yaml.seq) ? Number(yaml.seq) : 1;
    } else if (yaml.meta?.seq !== undefined) {
      transformedJson.meta.seq = !isNaN(yaml.meta.seq) ? Number(yaml.meta.seq) : 1;
    }

    transformedJson.request = {
      headers: mapArrayWithEnabledField(yaml.request?.headers || yaml.headers || []),
      auth: parseAuth(yaml.request?.auth || yaml.auth || {}),
      script: {
        req: yaml.request?.scripts?.preRequest || yaml.scripts?.preRequest || '',
        res: yaml.request?.scripts?.postResponse || yaml.scripts?.postResponse || ''
      },
      vars: {
        req: yaml.request?.variables || yaml.variables || [],
        res: []
      },
      tests: yaml.request?.scripts?.tests || yaml.scripts?.tests || ''
    };

    if (yaml.docs || yaml.request?.docs) {
      transformedJson.docs = yaml.docs || yaml.request.docs;
    }

    if (yaml.request?.settings || yaml.settings) {
      transformedJson.settings = yaml.request?.settings || yaml.settings;
    }

    return transformedJson;
  } catch (error) {
    console.error('Error parsing YAML folder:', error);
    return Promise.reject(error);
  }
};

export const jsonFolderToYaml = (json: any): string => {
  try {
    const folderYamlObj: any = {
      type: 'folder',
      name: json.meta?.name || 'Untitled Folder'
    };

    if (json.meta?.seq !== undefined) {
      folderYamlObj.seq = json.meta.seq;
    }

    const hasRequestDefaults
      = (json.request?.headers && json.request.headers.length > 0)
        || (json.request?.auth && json.request.auth.mode !== 'none')
        || (json.request?.script?.req || json.request?.script?.res)
        || (json.request?.vars?.req && json.request.vars.req.length > 0)
        || json.request?.tests;

    if (hasRequestDefaults) {
      folderYamlObj.request = {};

      if (json.request?.headers && json.request.headers.length > 0) {
        folderYamlObj.request.headers = mapArrayWithDisabledField(json.request.headers);
      }

      const authContent = serializeAuth(json.request?.auth);
      if (authContent) {
        folderYamlObj.request.auth = authContent;
      }

      if (json.request?.vars?.req && json.request.vars.req.length > 0) {
        folderYamlObj.request.variables = mapArrayWithDisabledField(json.request.vars.req);
      }

      const reqScript = json.request?.script?.req || '';
      const resScript = json.request?.script?.res || '';
      const tests = json.request?.tests || '';

      if (reqScript || resScript || tests) {
        folderYamlObj.request.scripts = {};
        if (reqScript) folderYamlObj.request.scripts.preRequest = reqScript;
        if (resScript) folderYamlObj.request.scripts.postResponse = resScript;
        if (tests) folderYamlObj.request.scripts.tests = tests;
      }

      if (json.request?.settings) {
        folderYamlObj.request.settings = json.request.settings;
      }
    }

    if (json.docs) {
      folderYamlObj.docs = json.docs;
    }

    return YAML.stringify(folderYamlObj, {
      lineWidth: 0,
      indent: 2,
      minContentWidth: 0,
      defaultStringType: 'PLAIN'
    });
  } catch (error) {
    console.error('Error converting folder to YAML:', error);
    throw error;
  }
};

/**
 * Parse Collection root YAML following OpenCollection root schema
 */
export const yamlCollectionToJson = (data: string | any, parsed: boolean = false): any => {
  try {
    const yaml = parsed ? data : YAML.parse(data);

    const transformedJson: any = {};

    if (yaml.name) {
      transformedJson.name = yaml.name;
    }

    if (yaml.description) {
      transformedJson.description = yaml.description;
    }

    if (yaml.request) {
      transformedJson.request = {
        headers: mapArrayWithEnabledField(yaml.request.headers || []),
        auth: parseAuth(yaml.request.auth || {}),
        script: {
          req: yaml.request.scripts?.preRequest || '',
          res: yaml.request.scripts?.postResponse || ''
        },
        vars: {
          req: yaml.request.variables || [],
          res: []
        },
        tests: yaml.request.scripts?.tests || ''
      };

      if (yaml.request.settings) {
        transformedJson.settings = yaml.request.settings;
      }
    }

    if (yaml.docs) {
      transformedJson.docs = yaml.docs;
    }

    if (yaml.config) {
      transformedJson.config = yaml.config;
    }

    return transformedJson;
  } catch (error) {
    console.error('Error parsing YAML collection:', error);
    return Promise.reject(error);
  }
};

export const jsonCollectionToYaml = (json: any): string => {
  try {
    const collectionYamlObj: any = {};

    if (json.name) {
      collectionYamlObj.name = json.name;
    }

    if (json.description) {
      collectionYamlObj.description = json.description;
    }

    const hasRequestDefaults
      = (json.request?.headers && json.request.headers.length > 0)
        || (json.request?.auth && json.request.auth.mode !== 'none')
        || (json.request?.script?.req || json.request?.script?.res)
        || (json.request?.vars?.req && json.request.vars.req.length > 0)
        || json.request?.tests;

    if (hasRequestDefaults) {
      collectionYamlObj.request = {};

      if (json.request?.headers && json.request.headers.length > 0) {
        collectionYamlObj.request.headers = mapArrayWithDisabledField(json.request.headers);
      }

      const authContent = serializeAuth(json.request?.auth);
      if (authContent) {
        collectionYamlObj.request.auth = authContent;
      }

      if (json.request?.vars?.req && json.request.vars.req.length > 0) {
        collectionYamlObj.request.variables = mapArrayWithDisabledField(json.request.vars.req);
      }

      const reqScript = json.request?.script?.req || '';
      const resScript = json.request?.script?.res || '';
      const tests = json.request?.tests || '';

      if (reqScript || resScript || tests) {
        collectionYamlObj.request.scripts = {};
        if (reqScript) collectionYamlObj.request.scripts.preRequest = reqScript;
        if (resScript) collectionYamlObj.request.scripts.postResponse = resScript;
        if (tests) collectionYamlObj.request.scripts.tests = tests;
      }

      if (json.settings) {
        collectionYamlObj.request.settings = json.settings;
      }
    }

    if (json.docs) {
      collectionYamlObj.docs = json.docs;
    }

    if (json.config) {
      collectionYamlObj.config = json.config;
    }

    return YAML.stringify(collectionYamlObj, {
      lineWidth: 0,
      indent: 2,
      minContentWidth: 0,
      defaultStringType: 'PLAIN'
    });
  } catch (error) {
    console.error('Error converting collection to YAML:', error);
    throw error;
  }
};

export const yamlEnvironmentToJson = (yaml: string): any => {
  try {
    const json = YAML.parse(yaml);

    if (json && json.variables && json.variables.length) {
      _.each(json.variables, (v: any) => {
        v.type = 'text';
        if (v.secret === undefined) {
          v.secret = false;
        }
        if (v.disabled !== undefined) {
          v.enabled = !v.disabled;
          delete v.disabled;
        } else {
          v.enabled = true;
        }
      });
    }

    return json;
  } catch (error) {
    console.error('[YAML] Error parsing YAML environment:', error);
    return Promise.reject(error);
  }
};

export const jsonEnvironmentToYaml = (json: any): string => {
  try {
    const { uid, ...envCopy } = _.cloneDeep(json);

    if (envCopy.variables && envCopy.variables.length) {
      const regularVars: any[] = [];
      const secretVars: any[] = [];

      envCopy.variables.forEach((variable: any) => {
        const { uid: varUid, type, enabled, ...cleanVar } = variable;

        if (enabled === false) {
          cleanVar.disabled = true;
        }

        const cleanedVar = cleanFalseBooleans(cleanVar);

        if (variable.secret) {
          const secretVar: any = {
            name: cleanedVar.name,
            secret: true
          };

          if (cleanedVar.disabled) {
            secretVar.disabled = cleanedVar.disabled;
          }

          if (cleanedVar.description) {
            secretVar.description = cleanedVar.description;
          }

          secretVars.push(secretVar);
        } else {
          regularVars.push(cleanedVar);
        }
      });

      envCopy.variables = [...regularVars, ...secretVars];
    }

    return YAML.stringify(envCopy, {
      lineWidth: 0,
      indent: 2,
      minContentWidth: 0,
      defaultStringType: 'PLAIN'
    });
  } catch (error) {
    console.error('[YAML] Error converting environment to YAML:', error);
    throw error;
  }
};

export const yamlOpenCollectionToJson = (data: string | any, parsed: boolean = false): any => {
  try {
    const yaml = parsed ? data : YAML.parse(data);

    const result: any = {
      brunoConfig: {
        version: yaml.opencollection || '1',
        name: yaml.name || yaml.info?.name || 'Untitled Collection',
        type: 'collection',
        filetype: 'yaml'
      },
      root: {
        meta: {
          name: yaml.name || yaml.info?.name || 'Untitled Collection'
        }
      }
    };

    if (yaml.ignore) {
      result.brunoConfig.ignore = yaml.ignore;
    } else {
      result.brunoConfig.ignore = ['node_modules', '.git'];
    }

    if (yaml.config?.proxy) {
      result.brunoConfig.proxy = yaml.config.proxy;
    }

    if (yaml.config?.clientCertificates) {
      result.brunoConfig.clientCertificates = yaml.config.clientCertificates;
    }

    if (yaml.config?.protobuf) {
      result.brunoConfig.protobuf = yaml.config.protobuf;
    }

    if (yaml.request) {
      result.root.request = {
        headers: mapArrayWithEnabledField(yaml.request.headers || []),
        auth: parseAuth(yaml.request.auth || {}),
        script: {
          req: yaml.request.scripts?.preRequest || '',
          res: yaml.request.scripts?.postResponse || ''
        },
        vars: {
          req: mapArrayWithEnabledField(yaml.request.variables || []),
          res: []
        },
        tests: yaml.request.scripts?.tests || ''
      };

      if (yaml.request.settings) {
        result.root.request.settings = yaml.request.settings;
      }
    }

    if (yaml.docs) {
      result.root.docs = yaml.docs;
    }

    if (yaml.info) {
      if (!result.root.meta) result.root.meta = {};
      result.root.meta.name = yaml.info.name || yaml.name;
      if (yaml.info.summary) {
        result.root.description = yaml.info.summary;
      }
    }

    return result;
  } catch (error) {
    console.error('[YAML] Error parsing opencollection.yml:', error);
    return Promise.reject(error);
  }
};

export const jsonToYamlOpenCollection = (brunoConfig: any, collectionRoot: any = {}): string => {
  try {
    const completeJson: any = {
      opencollection: brunoConfig.version || '1',
      info: {
        name: brunoConfig.name || collectionRoot.name || 'Untitled Collection'
      }
    };

    if (collectionRoot.description) {
      completeJson.info.summary = collectionRoot.description;
    }

    if (brunoConfig.ignore && brunoConfig.ignore.length > 0) {
      completeJson.ignore = brunoConfig.ignore;
    }

    if (brunoConfig.proxy || brunoConfig.clientCertificates || brunoConfig.protobuf) {
      completeJson.config = {};

      if (brunoConfig.proxy) {
        completeJson.config.proxy = brunoConfig.proxy;
      }

      if (brunoConfig.clientCertificates) {
        completeJson.config.clientCertificates = brunoConfig.clientCertificates;
      }

      if (brunoConfig.protobuf) {
        completeJson.config.protobuf = brunoConfig.protobuf;
      }
    }

    if (collectionRoot.request) {
      completeJson.request = {};

      if (collectionRoot.request.headers && collectionRoot.request.headers.length > 0) {
        completeJson.request.headers = mapArrayWithDisabledField(collectionRoot.request.headers);
      }

      const authContent = serializeAuth(collectionRoot.request.auth);
      if (authContent && Object.keys(authContent).length > 0) {
        completeJson.request.auth = authContent;
      }

      if (collectionRoot.request.vars?.req && collectionRoot.request.vars.req.length > 0) {
        completeJson.request.variables = mapArrayWithDisabledField(collectionRoot.request.vars.req);
      }

      const reqScript = collectionRoot.request.script?.req || '';
      const resScript = collectionRoot.request.script?.res || '';
      const tests = collectionRoot.request.tests || '';

      if (reqScript || resScript || tests) {
        completeJson.request.scripts = {};
        if (reqScript) completeJson.request.scripts.preRequest = reqScript;
        if (resScript) completeJson.request.scripts.postResponse = resScript;
        if (tests) completeJson.request.scripts.tests = tests;
      }

      if (collectionRoot.settings) {
        completeJson.request.settings = collectionRoot.settings;
      }
    }

    if (collectionRoot.docs) {
      completeJson.docs = collectionRoot.docs;
    }

    const cleanedJson = cleanFalseBooleans(completeJson);

    return YAML.stringify(cleanedJson, {
      lineWidth: 0,
      indent: 2,
      minContentWidth: 0,
      defaultStringType: 'PLAIN'
    });
  } catch (error) {
    console.error('[YAML] Error converting to opencollection.yml:', error);
    throw error;
  }
};

initializeValidator();
