import jsyaml from 'js-yaml';
import { interpolate } from '@usebruno/common';
import { isValidUrl } from 'utils/url/index';
const xml2js = require('xml2js');

export const exportApiSpec = ({ variables, items, name, environments }) => {
  items = items.filter((item) => !['grpc-request'].includes(item.type));

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

  // Build an OpenAPI server entry from a URL (supports {{var}} templates)
  const buildServerEntry = (url, vars, description) => {
    const cleanedUrl = url.endsWith('/') ? url.slice(0, -1) : url;
    const matches = [...cleanedUrl.matchAll(templateVarRegex)];
    const entry = {};

    if (matches.length > 0) {
      entry.url = cleanedUrl.replace(templateVarRegex, '{$1}');
      const serverVariables = {};

      // each match m is an array where m[0] is the full match (e.g. {{protocol}}) and m[1] is the capture group (e.g. protocol).
      matches.map((m) => m[1]).forEach((varName) => {
        if (vars[varName] !== undefined) {
          serverVariables[varName] = { default: String(vars[varName]) };
        }
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
      if (envVars.baseUrl) {
        baseUrlSources.push({ baseUrl: envVars.baseUrl, description: env.name, vars: envVars });
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

    const parts = pathname.split('\\');
    const baseDepth = parts.length - depth;
    if (depth === 1) return '';

    const tagIndex = Math.max(baseDepth, 0);

    return parts[tagIndex];
  };

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
        return { url: interpolate(path, variables), operationLevelServer: buildServerEntry(baseUrlOverride.value, reqVarsMap) };
      }
    }

    // URL uses {{baseUrl}} placeholder — strip it and resolve remaining path
    if (rawUrl.startsWith('{{baseUrl}}')) {
      const path = rawUrl.slice('{{baseUrl}}'.length) || '/';
      return { url: interpolate(path, variables), operationLevelServer: null };
    }

    // URL matches a known baseUrl value directly (e.g. user typed template vars inline)
    for (const source of baseUrlSources) {
      if (rawUrl.startsWith(source.baseUrl)) {
        const path = rawUrl.slice(source.baseUrl.length) || '/';
        return { url: interpolate(path, variables), operationLevelServer: null };
      }
    }

    // Unknown URL — resolve fully and add operation-level server override
    const resolvedUrl = interpolate(rawUrl, variables);
    if (isValidUrl(resolvedUrl)) {
      const urlDetails = new URL(resolvedUrl);
      return { url: urlDetails.pathname, operationLevelServer: buildServerEntry(urlDetails.origin, variables) };
    }

    return { url: rawUrl, operationLevelServer: null };
  };

  const generatePaths = () => {
    const _items = items.map((item) => {
      const { url, operationLevelServer } = resolveRequestUrl(item?.request?.url || '', item?.request?.vars?.req);
      const { request } = item;
      const { method, params = [], headers = [], body, auth } = request || {};

      // PARAMS

      const pathParamsRegex = /(?<!{){([^{}]+)}(?!})/g;

      const pathMatches = url.match(pathParamsRegex) || [];

      // Build known path param names from the params array
      const knownPathParamNames = new Set(
        params?.filter((p) => p?.type === 'path').map((p) => p?.name) || []
      );

      const parameters = [
        // Query params (exclude path-type params to avoid duplication)
        ...params?.filter((p) => p?.type !== 'path').map((param) => ({
          name: param?.name,
          in: 'query',
          description: '',
          required: param?.enabled,
          example: param?.value
        })),
        ...headers?.map((header) => ({
          name: header?.name,
          in: 'header',
          description: '',
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

      let schemaId = `${item?.name?.split(' ').join('_').toLowerCase()}`;
      let securitySchemaId = `${item?.name?.split(' ').join('_').toLowerCase()}`;
      let requestBodyId = `${item?.name?.split(' ').join('_').toLowerCase()}`;
      if (body?.mode) {
        switch (body?.mode) {
          case 'json':
            if (!body?.json) break;
            try {
              const parsedJson = JSON.parse(body.json);
              const schema = generateProperyShape(parsedJson);
              schema.example = parsedJson;
              components.schemas[schemaId] = schema;
              components.requestBodies[requestBodyId] = {
                content: {
                  'application/json': {
                    schema: {
                      $ref: `#/components/schemas/${schemaId}`
                    }
                  }
                },
                description: '',
                required: true
              };
              pathBody['requestBody'] = {
                $ref: `#/components/requestBodies/${requestBodyId}`
              };
            } catch (error) {
              addWarning(`Failed to parse JSON in request body: ${error.message}`, item?.name);
              components.schemas[schemaId] = {
                type: 'object',
                properties: {}
              };
              components.requestBodies[requestBodyId] = {
                content: {
                  'application/json': {
                    schema: {
                      $ref: `#/components/schemas/${schemaId}`
                    }
                  }
                },
                description: '',
                required: true
              };
              pathBody['requestBody'] = {
                $ref: `#/components/requestBodies/${requestBodyId}`
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
              const xmlSchema = generateProperyShape(jsonResult);
              xmlSchema.example = jsonResult;
              components.schemas[schemaId] = xmlSchema;
              components.requestBodies[requestBodyId] = {
                content: {
                  'application/xml': {
                    schema: {
                      $ref: `#/components/schemas/${schemaId}`
                    }
                  }
                },
                description: '',
                required: true
              };
              pathBody['requestBody'] = {
                $ref: `#/components/requestBodies/${requestBodyId}`
              };
            } catch (error) {
              addWarning(`Failed to parse XML in request body: ${error.message}`, item?.name);
            }
            break;
          case 'multipartForm':
            if (!body?.multipartForm) return;
            let multipartFormToKeyValue = body?.multipartForm.reduce((acc, f) => {
              acc[f?.name] = f.value;
              return acc;
            }, {});
            components.schemas[schemaId] = generateProperyShape(multipartFormToKeyValue);
            components.requestBodies[requestBodyId] = {
              content: {
                'multipart/form-data:': {
                  schema: {
                    $ref: `#/components/schemas/${schemaId}`
                  }
                }
              },
              description: '',
              required: true
            };
            pathBody['requestBody'] = {
              $ref: `#/components/requestBodies/${requestBodyId}`
            };
          case 'formUrlEncoded':
            if (!body?.formUrlEncoded) return;
            let formUrlEncodedToKeyValue = body?.formUrlEncoded.reduce((acc, f) => {
              acc[f?.name] = f.value;
              return acc;
            }, {});
            components.schemas[schemaId] = generateProperyShape(formUrlEncodedToKeyValue);
            components.requestBodies[requestBodyId] = {
              content: {
                'application/x-www-form-urlencoded:': {
                  schema: {
                    $ref: `#/components/schemas/${schemaId}`
                  }
                }
              },
              description: '',
              required: true
            };
            pathBody['requestBody'] = {
              $ref: `#/components/requestBodies/${requestBodyId}`
            };
          case 'text':
            if (!body?.text) return;
            pathBody['requestBody'] = {
              content: {
                'text/plain': {
                  schema: {
                    type: 'string'
                  }
                }
              }
            };
          default:
            break;
        }
      }

      // AUTH

      if (auth?.mode) {
        switch (auth?.mode) {
          case 'basic':
            components.securitySchemes[securitySchemaId] = {
              type: 'http',
              scheme: 'basic'
            };
            pathBody['security'] = {
              [securitySchemaId]: []
            };
            break;
          case 'bearer':
            components.securitySchemes[securitySchemaId] = {
              type: 'http',
              scheme: 'bearer'
            };
            pathBody['security'] = {
              [securitySchemaId]: []
            };
            break;
          case 'oauth2':
            if (!auth?.oauth2?.grantType) break;
            const { authorizationUrl, accessTokenUrl, callbackUrl, scope } = auth?.oauth2;
            switch (auth?.oauth2?.grantType) {
              case 'authorization_code':
                components.securitySchemes[securitySchemaId] = {
                  type: 'oauth2',
                  flows: {
                    authorizationCode: {
                      authorizationUrl,
                      tokenUrl: accessTokenUrl,
                      ...(scope.length > 0
                        ? {
                            scopes: {
                              [scope]: ''
                            }
                          }
                        : {})
                    }
                  }
                };
                pathBody['security'] = {
                  [securitySchemaId]: []
                };
                break;
              case 'password':
                components.securitySchemes[securitySchemaId] = {
                  type: 'oauth2',
                  flows: {
                    password: {
                      tokenUrl: accessTokenUrl,
                      ...(scope.length > 0
                        ? {
                            scopes: {
                              [scope]: ''
                            }
                          }
                        : {})
                    }
                  }
                };
                pathBody['security'] = {
                  [securitySchemaId]: []
                };
                break;
              case 'client_credentials':
                components.securitySchemes[securitySchemaId] = {
                  type: 'oauth2',
                  flows: {
                    password: {
                      tokenUrl: accessTokenUrl,
                      ...(scope.length > 0
                        ? {
                            scopes: {
                              [scope]: ''
                            }
                          }
                        : {})
                    }
                  }
                };
                pathBody['security'] = {
                  [securitySchemaId]: []
                };
                break;
            }
            break;
          case 'awsv4':
            components.securitySchemes[securitySchemaId] = {
              'type': 'apiKey',
              'name': 'Authorization',
              'in': 'header',
              'x-amazon-apigateway-authtype': 'awsSigv4'
            };
            pathBody['security'] = {
              [securitySchemaId]: []
            };
            break;
          case 'digest':
            components.securitySchemes[securitySchemaId] = {
              type: 'digest',
              scheme: 'digest',
              description: 'Digest Authentication'
            };
            pathBody['security'] = {
              [securitySchemaId]: []
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
      acc[item?.url][item?.method] = item?.data;
      // Add operation-level server override inside the operation object (not path-item level)
      // so the import can read it back from operationObject.servers
      if (item?.operationLevelServer) {
        acc[item?.url][item?.method].servers = [item.operationLevelServer];
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

// Convert env variable array to { name: value } object (only enabled vars)
const getEnabledVarsAsObject = (variables = []) => {
  const result = {};
  variables.forEach((v) => {
    if (v.name && v.enabled) {
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
