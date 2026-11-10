import jsyaml from 'js-yaml';
import { interpolate } from '@usebruno/common';
import { parseQueryParams } from '@usebruno/common/utils';
import { isValidUrl, splitOnFirst } from 'utils/url/index';
const xml2js = require('xml2js');

const placeholderRegex = /\{\{([^}]+)\}\}/g;

// Blank out {{...}} placeholders, so characters inside them (like the ? of a prompt variable) aren't read as url syntax
const maskPlaceholders = (value) => value.replace(placeholderRegex, (placeholder) => '_'.repeat(placeholder.length));

// Query params of a raw url as { name, value } pairs, first occurrence of each name
const getUrlQueryParams = (url) => {
  const [, query] = splitOnFirst(url, '?');
  const seen = new Set();
  return parseQueryParams(query)
    .map(({ name, value }) => ({ name, value: value ?? '' }))
    .filter(({ name }) => !seen.has(name) && seen.add(name));
};

// Split a url into server and path as text when the URL parser can't be used: the address (scheme, host or port) has a
// placeholder in it, or the url has no scheme. Placeholders stay whole and keep their spelling.
const splitAddressAsText = (url) => {
  const masked = maskPlaceholders(url);
  if (!masked || masked.startsWith('/')) return null;

  const [scheme = ''] = masked.match(/^[^/?#]*?:\/\//) || [];
  const addressLength = masked.slice(scheme.length).search(/[/?#]/);
  const addressEnd = addressLength === -1 ? masked.length : scheme.length + addressLength;
  if (scheme && !url.slice(0, addressEnd).includes('{{')) return null;

  const credentialsEnd = masked.lastIndexOf('@', addressEnd - 1);
  const hostStart = credentialsEnd >= scheme.length ? credentialsEnd + 1 : scheme.length;
  const host = url.slice(hostStart, addressEnd);
  if (!host) return null;

  const rest = url.slice(addressEnd);
  return { server: url.slice(0, scheme.length) + host, path: rest.startsWith('/') ? rest : `/${rest}` };
};

// Turn a Bruno path into an OpenAPI path template: {{name}} placeholders and :name segments become {name}
const toTemplatePath = (path) => {
  const masked = maskPlaceholders(path);
  const segmentParamNames = [];
  let templatePath = '';
  let copiedUpTo = 0;
  for (const match of masked.matchAll(/(^|\/):([^/]+)/g)) {
    const nameStart = match.index + match[1].length + 1;
    const name = path.slice(nameStart, nameStart + match[2].length);
    if (name.includes('{{')) continue;
    templatePath += `${path.slice(copiedUpTo, nameStart - 1)}{${name}}`;
    segmentParamNames.push(name);
    copiedUpTo = nameStart + name.length;
  }
  templatePath += path.slice(copiedUpTo);
  return { templatePath: templatePath.replace(placeholderRegex, '{$1}'), segmentParamNames };
};

export const exportApiSpec = ({ variables, items, name, environments }) => {
  // Filter only include http-request and graphql-request items that aren't transient
  items = items.filter((item) => ['http-request', 'graphql-request'].includes(item.type) && !item.isTransient);

  const components = {
    schemas: {},
    requestBodies: {},
    securitySchemes: {}
  };

  const servers = [];
  const warnings = [];

  const addWarning = (message, itemName) => {
    warnings.push({
      message,
      itemName
    });
  };

  const templateVarRegex = /\{\{([^}]+)\}\}/g;

  const secretVariableNames = new Set(
    (environments || []).flatMap((env) => (env.variables || []).filter((v) => v.enabled && v.secret).map((v) => v.name))
  );
  const isSecretName = (varName) => secretVariableNames.has(varName) || /^(\$secrets|process|\$oauth2)(\.|$)/.test(varName);

  // Secrets are never filled in, even when the caller passes their values
  variables = Object.fromEntries(Object.entries(variables || {}).filter(([varName]) => !isSecretName(varName)));

  // Build an OpenAPI server entry from a URL (supports {{var}} templates)
  const buildServerEntry = (url, vars, description) => {
    const cleanedUrl = url.endsWith('/') ? url.slice(0, -1) : url;
    const matches = [...cleanedUrl.matchAll(templateVarRegex)];
    const entry = {};

    if (matches.length > 0) {
      entry.url = cleanedUrl.replace(templateVarRegex, '{$1}');
      const serverVariables = {};

      // each match m is an array where m[0] is the full match (e.g. {{protocol}}) and m[1] is the capture group (e.g. protocol).
      matches.forEach((m) => {
        const varName = m[1];
        // A secret keeps its placeholder text as a hint; any other variable without a value stays empty
        const hasValue = Object.hasOwn(vars, varName) && vars[varName] !== undefined;
        const fallback = isSecretName(varName) ? `{{${varName}}}` : '';
        serverVariables[varName] = { default: hasValue ? String(vars[varName]) : fallback };
      });
      if (Object.keys(serverVariables).length > 0) {
        entry.variables = serverVariables;
      }
    } else {
      entry.url = cleanedUrl;
    }

    if (description) entry.description = description;
    return entry;
  };

  // Collect all baseUrl sources: collection variables + each environment
  // Each source becomes a self-contained server entry in the OpenAPI spec.
  // On import, each server entry maps to a separate Bruno environment.
  const baseUrlSources = [];

  // Add collection-level baseUrl if present
  const collectionBaseUrl = variables?.baseUrl || '';
  if (collectionBaseUrl) {
    baseUrlSources.push({ baseUrl: collectionBaseUrl, description: 'Base Server', vars: variables });
  }

  // Add each environment that defines its own baseUrl
  if (environments && environments.length > 0) {
    for (const env of environments) {
      const envVars = getEnabledVarsAsObject(env.variables);
      const isBaseUrlSecret = env.variables?.some((v) => v.name === 'baseUrl' && v.enabled && v.secret);
      const baseUrl = isBaseUrlSecret ? '{{baseUrl}}' : envVars.baseUrl;
      if (baseUrl) {
        baseUrlSources.push({ baseUrl, description: env.name, vars: envVars });
      }
    }
  }

  // Build root server entries
  for (const source of baseUrlSources) {
    servers.push(buildServerEntry(source.baseUrl, source.vars, source.description));
  }

  const extractTagFromDepth = (item) => {
    const { pathname, depth } = item;
    if (!pathname) return;

    const parts = pathname.split(/[\\/]/);
    const baseDepth = parts.length - depth;
    if (depth === 1) return '';

    const tagIndex = Math.max(baseDepth, 0);

    return parts[tagIndex];
  };

  const componentIds = new Set();

  const getComponentId = (item) => {
    const baseId = String(item?.name || 'request')
      .replace(/[^a-zA-Z0-9._-]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .toLowerCase() || 'request';
    let componentId = baseId;
    let suffix = 1;

    while (componentIds.has(componentId)) {
      componentId = `${baseId}_${suffix}`;
      suffix += 1;
    }
    componentIds.add(componentId);

    return componentId;
  };

  const restoreUnresolvedPlaceholders = (value) => value.replace(/%7B%7B(.*?)%7D%7D/gi, '{{$1}}');

  // Resolve a raw request URL to a path and optional operation-level server override.
  // Checks for request-level baseUrl overrides (vars.req), then {{baseUrl}} placeholder,
  // then known baseUrl sources. Falls back to full resolution for unknown URLs.
  const resolveRequestUrl = (rawUrl, requestVars) => {
    // Request has a baseUrl override in vars.req — export as operation-level server
    if (rawUrl.startsWith('{{baseUrl}}') && requestVars) {
      const baseUrlOverride = requestVars.find((v) => v.name === 'baseUrl' && v.enabled);
      if (baseUrlOverride) {
        const reqVarsMap = {};
        requestVars.filter((v) => v.enabled).forEach((v) => { reqVarsMap[v.name] = v.value; });
        const path = rawUrl.slice('{{baseUrl}}'.length) || '/';
        return { url: interpolate(path, reqVarsMap), operationLevelServer: buildServerEntry(baseUrlOverride.value, reqVarsMap) };
      }
    }

    // URL uses {{baseUrl}} placeholder — strip it and resolve remaining path
    if (rawUrl.startsWith('{{baseUrl}}')) {
      const path = rawUrl.slice('{{baseUrl}}'.length) || '/';
      return { url: path, operationLevelServer: null };
    }

    // URL matches a known baseUrl value directly (e.g. user typed template vars inline)
    for (const source of baseUrlSources) {
      const baseUrl = source.baseUrl.replace(/\/+$/, '');
      const rest = rawUrl.slice(baseUrl.length);
      if (rawUrl.startsWith(baseUrl) && (rest === '' || /^[/?#]/.test(rest))) {
        const rawPath = rest;
        const path = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
        return { url: path, operationLevelServer: null };
      }
    }

    // Unknown URL — resolve fully and add operation-level server override
    const resolvedUrl = interpolate(rawUrl, variables);
    const textSplit = splitAddressAsText(resolvedUrl);
    if (textSplit) {
      return { url: textSplit.path, operationLevelServer: buildServerEntry(textSplit.server, variables) };
    }

    if (isValidUrl(resolvedUrl)) {
      const urlDetails = new URL(resolvedUrl);
      return {
        url: restoreUnresolvedPlaceholders(urlDetails.pathname),
        operationLevelServer: buildServerEntry(urlDetails.origin, variables)
      };
    }

    return { url: rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`, operationLevelServer: null };
  };

  const generatePaths = () => {
    const _items = items.map((item) => {
      const { url: rawPath, operationLevelServer } = resolveRequestUrl(item?.request?.url || '', item?.request?.vars?.req);
      const queryStart = maskPlaceholders(rawPath).search(/[?#]/);
      const pathOnly = queryStart === -1 ? rawPath : rawPath.slice(0, queryStart);
      const placeholderNames = [...new Set([...pathOnly.matchAll(templateVarRegex)].map((m) => m[1]))];
      const { templatePath: url, segmentParamNames } = toTemplatePath(pathOnly);
      const urlQueryParams = getUrlQueryParams(item?.request?.url || '');
      const { request } = item;
      const { method, params = [], headers = [], body, auth } = request || {};

      // PARAMS

      const pathParamsRegex = /(?<!{){([^{}]+)}(?!})/g;

      const pathMatches = pathOnly.match(pathParamsRegex) || [];

      // Build known path param names from the params array
      const knownPathParamNames = new Set(
        params?.filter((p) => p?.type === 'path').map((p) => p?.name) || []
      );

      const queryParamNames = new Set(params?.filter((p) => p?.type !== 'path').map((p) => p?.name));

      const parameters = [
        // Query params (exclude path-type params to avoid duplication)
        ...params?.filter((p) => p?.type !== 'path').map((param) => ({
          name: param?.name,
          in: 'query',
          description: param?.description || '',
          required: param?.enabled,
          example: param?.value
        })),
        // Query params written only in the url, not in the params list
        ...urlQueryParams
          .filter(({ name }) => !queryParamNames.has(name))
          .map(({ name, value }) => ({
            name,
            in: 'query',
            description: '',
            required: true,
            example: value
          })),
        ...headers?.map((header) => ({
          name: header?.name,
          in: 'header',
          description: header?.description || '',
          required: header?.enabled,
          example: header?.value
        })),
        // Path params from the params array (have values from Bruno)
        ...params?.filter((p) => p?.type === 'path').map((param) => ({
          name: param?.name,
          in: 'path',
          required: true,
          example: param?.value
        })),
        // Path params from URL regex that aren't already in the params array
        ...pathMatches
          ?.map((path) => path.slice(1, path.length - 1))
          .filter((name) => !knownPathParamNames.has(name))
          .map((name) => ({
            name,
            in: 'path',
            required: true
          })),
        // Bruno :name path params that aren't in the params array
        ...segmentParamNames
          .filter((name) => !knownPathParamNames.has(name))
          .map((name) => ({
            name,
            in: 'path',
            required: true
          })),
        ...placeholderNames
          .filter((name) => !knownPathParamNames.has(name))
          .map((name) => ({
            name,
            in: 'path',
            required: true,
            example: `{{${name}}}`,
            schema: { type: 'string' }
          }))
      ];

      const pathBody = {
        summary: item?.name,
        operationId: item?.name,
        description: '',
        tags: [extractTagFromDepth(item)],
        responses: {
          200: {
            description: ''
          }
        }
      };

      if (parameters?.length) {
        pathBody['parameters'] = parameters;
      }

      // BODY

      let componentId;
      const getItemComponentId = () => {
        if (!componentId) {
          componentId = getComponentId(item);
        }

        return componentId;
      };
      if (body?.mode) {
        switch (body?.mode) {
          case 'json':
            if (!body?.json) break;
            try {
              const componentId = getItemComponentId();
              const parsedJson = JSON.parse(body.json);
              const schema = generateProperyShape(parsedJson);
              schema.example = parsedJson;
              components.schemas[componentId] = schema;
              components.requestBodies[componentId] = {
                content: {
                  'application/json': {
                    schema: {
                      $ref: `#/components/schemas/${componentId}`
                    }
                  }
                },
                description: '',
                required: true
              };
              pathBody['requestBody'] = {
                $ref: `#/components/requestBodies/${componentId}`
              };
            } catch (error) {
              addWarning(`Failed to parse JSON in request body: ${error.message}`, item?.name);
              const componentId = getItemComponentId();
              components.schemas[componentId] = {
                type: 'object',
                properties: {}
              };
              components.requestBodies[componentId] = {
                content: {
                  'application/json': {
                    schema: {
                      $ref: `#/components/schemas/${componentId}`
                    }
                  }
                },
                description: '',
                required: true
              };
              pathBody['requestBody'] = {
                $ref: `#/components/requestBodies/${componentId}`
              };
            }
            break;
          case 'xml':
            if (!body?.xml) break;
            try {
              const jsonResult = xmlToJson(body?.xml);
              if (!jsonResult) {
                addWarning('Failed to parse XML in request body', item?.name);
                break;
              }
              const componentId = getItemComponentId();
              const xmlSchema = generateProperyShape(jsonResult);
              xmlSchema.example = jsonResult;
              components.schemas[componentId] = xmlSchema;
              components.requestBodies[componentId] = {
                content: {
                  'application/xml': {
                    schema: {
                      $ref: `#/components/schemas/${componentId}`
                    }
                  }
                },
                description: '',
                required: true
              };
              pathBody['requestBody'] = {
                $ref: `#/components/requestBodies/${componentId}`
              };
            } catch (error) {
              addWarning(`Failed to parse XML in request body: ${error.message}`, item?.name);
            }
            break;
          case 'multipartForm':
            if (!body?.multipartForm) break;
            const multipartFormComponentId = getItemComponentId();
            {
              const multipartFormProps = {};
              body.multipartForm.forEach((f) => {
                const prop = generateProperyShape(f.value);
                if (f.description) prop.description = f.description;
                multipartFormProps[f.name] = prop;
              });
              components.schemas[multipartFormComponentId] = { type: 'object', properties: multipartFormProps };
            }
            components.requestBodies[multipartFormComponentId] = {
              content: {
                'multipart/form-data': {
                  schema: {
                    $ref: `#/components/schemas/${multipartFormComponentId}`
                  }
                }
              },
              description: '',
              required: true
            };
            pathBody['requestBody'] = {
              $ref: `#/components/requestBodies/${multipartFormComponentId}`
            };
            break;
          case 'formUrlEncoded':
            if (!body?.formUrlEncoded) break;
            const formUrlEncodedComponentId = getItemComponentId();
            {
              const formUrlEncodedProps = {};
              body.formUrlEncoded.forEach((f) => {
                const prop = generateProperyShape(f.value);
                if (f.description) prop.description = f.description;
                formUrlEncodedProps[f.name] = prop;
              });
              components.schemas[formUrlEncodedComponentId] = { type: 'object', properties: formUrlEncodedProps };
            }
            components.requestBodies[formUrlEncodedComponentId] = {
              content: {
                'application/x-www-form-urlencoded': {
                  schema: {
                    $ref: `#/components/schemas/${formUrlEncodedComponentId}`
                  }
                }
              },
              description: '',
              required: true
            };
            pathBody['requestBody'] = {
              $ref: `#/components/requestBodies/${formUrlEncodedComponentId}`
            };
            break;
          case 'text':
            if (!body?.text) break;
            pathBody['requestBody'] = {
              content: {
                'text/plain': {
                  schema: {
                    type: 'string'
                  }
                }
              }
            };
            break;
          default:
            break;
        }
      }

      // AUTH

      if (auth?.mode) {
        switch (auth?.mode) {
          case 'basic':
            componentId = getItemComponentId();
            components.securitySchemes[componentId] = {
              type: 'http',
              scheme: 'basic'
            };
            pathBody['security'] = {
              [componentId]: []
            };
            break;
          case 'bearer':
            componentId = getItemComponentId();
            components.securitySchemes[componentId] = {
              type: 'http',
              scheme: 'bearer'
            };
            pathBody['security'] = {
              [componentId]: []
            };
            break;
          case 'oauth2': {
            if (!auth?.oauth2?.grantType) break;
            componentId = getItemComponentId();
            const { authorizationUrl, accessTokenUrl, callbackUrl, scope } = auth?.oauth2;
            const scopes = scope ? { [scope]: '' } : {};
            switch (auth?.oauth2?.grantType) {
              case 'authorization_code':
                components.securitySchemes[componentId] = {
                  type: 'oauth2',
                  flows: {
                    authorizationCode: {
                      authorizationUrl,
                      tokenUrl: accessTokenUrl,
                      scopes
                    }
                  }
                };
                pathBody['security'] = {
                  [componentId]: []
                };
                break;
              case 'password':
                components.securitySchemes[componentId] = {
                  type: 'oauth2',
                  flows: {
                    password: {
                      tokenUrl: accessTokenUrl,
                      scopes
                    }
                  }
                };
                pathBody['security'] = {
                  [componentId]: []
                };
                break;
              case 'client_credentials':
                components.securitySchemes[componentId] = {
                  type: 'oauth2',
                  flows: {
                    password: {
                      tokenUrl: accessTokenUrl,
                      scopes
                    }
                  }
                };
                pathBody['security'] = {
                  [componentId]: []
                };
                break;
            }
            break;
          }
          case 'awsv4':
            componentId = getItemComponentId();
            components.securitySchemes[componentId] = {
              'type': 'apiKey',
              'name': 'Authorization',
              'in': 'header',
              'x-amazon-apigateway-authtype': 'awsSigv4'
            };
            pathBody['security'] = {
              [componentId]: []
            };
            break;
          case 'digest':
            componentId = getItemComponentId();
            components.securitySchemes[componentId] = {
              type: 'digest',
              scheme: 'digest',
              description: 'Digest Authentication'
            };
            pathBody['security'] = {
              [componentId]: []
            };
            break;
          default:
            break;
        }
      }

      return {
        url,
        method: method.toLowerCase(),
        data: pathBody,
        operationLevelServer
      };
    });

    return _items.reduce((acc, item) => {
      if (!acc[item?.url]) {
        acc[item?.url] = {};
      }
      const operation = item?.data;

      if (item?.operationLevelServer) {
        // Add operation-level server override inside the operation object (not path-item level)
        // so the import can read it back from operationObject.servers
        operation.servers = [item.operationLevelServer];
      }

      let operationObject = acc[item?.url][item?.method];

      if (operationObject) {
        operationObject['x-bruno-variants'] = [
          ...(operationObject['x-bruno-variants'] || []),
          operation
        ];
      } else {
        acc[item?.url][item?.method] = operation;
      }
      return acc;
    }, {});
  };

  const collectionToExport = {};
  collectionToExport.openapi = '3.0.0';
  collectionToExport.info = generateInfoSection(name);
  collectionToExport.paths = generatePaths();
  collectionToExport.servers = servers;
  collectionToExport.components = components;

  let yaml = jsyaml.dump(collectionToExport);

  return {
    content: yaml,
    warnings
  };
};

const xmlToJson = (xmlString) => {
  const parser = new xml2js.Parser({ explicitArray: false, trim: true });
  let jsonResult = null;

  parser.parseString(xmlString, (err, result) => {
    if (err) {
      throw err;
    } else {
      jsonResult = result;
    }
  });

  return jsonResult;
};

const generateInfoSection = (name) => {
  return {
    title: name,
    version: '1.0.0'
  };
};

// Convert env variable array to { name: value } object (only enabled vars; a name with an enabled secret is
// left out, because the secret wins at runtime)
const getEnabledVarsAsObject = (variables = []) => {
  const secretNames = new Set(variables.filter((v) => v.enabled && v.secret).map((v) => v.name));
  const result = {};
  variables.forEach((v) => {
    if (v.name && v.enabled && !secretNames.has(v.name)) {
      result[v.name] = v.value;
    }
  });
  return result;
};

const generateProperyShape = (obj) => {
  let data = {};

  // add 'type'
  if (Array.isArray(obj)) {
    data['type'] = 'array';
    data['items'] = {
      type: 'string'
    };
  } else {
    data['type'] = typeof obj;
  }

  // add 'properties'
  let properties = null;
  if (obj && typeof obj == 'object') {
    properties = {};
    let keys = Object.keys(obj);
    keys.forEach((key) => {
      let value = obj[key];
      properties[key] = generateProperyShape(value);
    });
    if (keys.length) {
      data['properties'] = properties;
    }
  }
  return data;
};
