const each = require('lodash/each');
const yaml = require('js-yaml');
const xml2js = require('xml2js');
const brunoCommon = require('@usebruno/common');
const { isValidUrl } = require('./utils');

const interpolate = brunoCommon.default.interpolate;

/**
 * Generates the property shape for the OpenAPI schema
 * @param {object} obj - The object to generate the shape from
 * @returns {object} - The property shape
 */
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

/**
 * Converts XML string to JSON
 * @param {string} xmlString - The XML string to convert
 * @returns {object} - The converted JSON object
 */
const xmlToJson = (xmlString) => {
  const parser = new xml2js.Parser({ explicitArray: false, trim: true });
  let jsonResult = null;

  parser.parseString(xmlString, (err, result) => {
    if (err) {
      console.error('Failed to parse XML: ', err);
    } else {
      jsonResult = result;
    }
  });

  return jsonResult;
};

/**
 * Generates the info section of the OpenAPI spec
 * @param {string} name - The name of the API
 * @returns {object} - The info section
 */
const generateInfoSection = (name) => {
  return {
    title: name,
    version: '1.0.0'
  };
};

/**
 * Get the parent folder name for an item
 * @param {Object} item - The item to get the parent folder name for
 * @returns {string} - The parent folder name or 'default' if none
 */
const getItemTag = (item) => {
  if (item.type === 'folder') {
    return item.name;
  }
  
  // Check if the item has a parent property
  if (item.parent && item.parent.name) {
    return item.parent.name;
  }
  
  // For items in the root collection
  return 'default';
};

/**
 * Process Bruno collection items recursively
 * @param {Array} items - Collection items
 * @param {Object} paths - OpenAPI paths object
 * @param {Array} tags - OpenAPI tags array
 * @param {Object} components - OpenAPI components object
 * @param {Array} servers - OpenAPI servers array
 * @param {Object} variables - Environment variables
 */
const processBrunoItems = (items, paths, tags, components, servers, variables) => {
  if (!items || !Array.isArray(items) || items.length === 0) {
    console.warn('No items to process or items is not an array');
    return;
  }

  each(items, (item) => {
    // Handle HTTP requests
    if (item.type === 'http' || item.type === 'http-request') {
      processHttpRequest(item, paths, components, servers, variables);
    } 
    else if (item.type === 'folder' && item.items && item.items.length) {
      // Add folder as a tag if it doesn't exist
      const tagName = item.name;
      if (!tags.find(t => t.name === tagName)) {
        tags.push({
          name: tagName,
          description: ''
        });
      }
      
      processBrunoItems(item.items, paths, tags, components, servers, variables);
    }
  });
};

/**
 * Process HTTP request item
 * @param {Object} item - HTTP request item
 * @param {Object} paths - OpenAPI paths object
 * @param {Object} components - OpenAPI components object
 * @param {Array} servers - OpenAPI servers array
 * @param {Object} variables - Environment variables
 */
const processHttpRequest = (item, paths, components, servers, variables) => {
  // Skip items without a valid request
  if (!item.request || !item.request.url || !item.request.method) {
    return;
  }

  let url = interpolate(item?.request?.url, variables);
  
  // Extract server URL if it's a valid URL
  if (isValidUrl(url)) {
    let urlDetails = new URL(url);
    urlDetails?.pathname && (url = urlDetails?.pathname);
    urlDetails?.origin && addUrlToServersList(urlDetails?.origin, servers);
  }
  
  // Decode URL path parameters
  url = decodeURIComponent(url);
  
  const { request } = item;
  const { method, params, headers, body, auth } = request || {};

  // PARAMS
  const pathParamsRegex = /(?<!{){([^{}]+)}(?!})/g;
  const pathMatches = url ? url.match(pathParamsRegex) || [] : [];

  const parameters = [
    ...params?.map((param) => ({
      name: param?.name,
      in: 'query',
      description: '',
      required: param?.enabled,
      example: param?.value
    })) || [],
    ...headers?.map((header) => ({
      name: header?.name,
      in: 'header',
      description: '',
      required: header?.enabled,
      example: header?.value
    })) || [],
    ...pathMatches?.map((path) => ({
      name: path.slice(1, path.length - 1),
      in: 'path',
      required: true
    }))
  ];

  const pathBody = {
    summary: item?.name,
    operationId: item?.name,
    description: '',
    tags: [getItemTag(item)],
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
          components.schemas[schemaId] = generateProperyShape(JSON.parse(body?.json));
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
        } catch (e) {
          console.error('Failed to parse JSON body:', e);
        }
        break;
      case 'xml':
        if (!body?.xml) break;
        components.schemas[schemaId] = generateProperyShape(xmlToJson(body?.xml));
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
        break;
      case 'multipartForm':
        if (!body?.multipartForm) break;
        let multipartFormToKeyValue = body?.multipartForm.reduce((acc, f) => {
          acc[f?.name] = f.value;
          return acc;
        }, {});
        components.schemas[schemaId] = generateProperyShape(multipartFormToKeyValue);
        components.requestBodies[requestBodyId] = {
          content: {
            'multipart/form-data': {
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
        break;
      case 'formUrlEncoded':
        if (!body?.formUrlEncoded) break;
        let formUrlEncodedToKeyValue = body?.formUrlEncoded.reduce((acc, f) => {
          acc[f?.name] = f.value;
          return acc;
        }, {});
        components.schemas[schemaId] = generateProperyShape(formUrlEncodedToKeyValue);
        components.requestBodies[requestBodyId] = {
          content: {
            'application/x-www-form-urlencoded': {
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
      case 'graphql':
        if (!body?.graphql?.query) break;
        try {
          // Create a schema for GraphQL queries
          components.schemas[schemaId] = {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                example: body.graphql.query
              },
              variables: {
                type: 'object',
                example: body.graphql.variables ? JSON.parse(body.graphql.variables) : {}
              }
            }
          };
          
          components.requestBodies[requestBodyId] = {
            content: {
              'application/json': {
                schema: {
                  $ref: `#/components/schemas/${schemaId}`
                }
              }
            },
            description: 'GraphQL query',
            required: true
          };
          
          pathBody['requestBody'] = {
            $ref: `#/components/requestBodies/${requestBodyId}`
          };
        } catch (e) {
          console.error('Failed to parse GraphQL query:', e);
        }
        break;
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
                  ...(scope && scope.length > 0
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
                  ...(scope && scope.length > 0
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
                clientCredentials: {
                  tokenUrl: accessTokenUrl,
                  ...(scope && scope.length > 0
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
          type: 'apiKey',
          name: 'Authorization',
          in: 'header',
          'x-amazon-apigateway-authtype': 'awsSigv4'
        };
        pathBody['security'] = {
          [securitySchemaId]: []
        };
        break;
      case 'digest':
        components.securitySchemes[securitySchemaId] = {
          type: 'http',
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

  // Add the path
  if (!paths[url]) {
    paths[url] = {};
  }
  paths[url][method.toLowerCase()] = pathBody;
};

/**
 * Add URL to servers list if not already present
 * @param {string} url - Server URL
 * @param {Array} servers - Servers array
 */
const addUrlToServersList = (url, servers) => {
  if(!servers.find(s => s.url === url)) {
    servers.push({ url });
  }
};

/**
 * Exports Bruno collection to OpenAPI specification
 * @param {Object} options - Options for export
 * @param {Object} options.variables - Environment variables
 * @param {Array} options.items - Collection items
 * @param {string} options.name - Collection name
 * @returns {string} - OpenAPI specification in YAML format
 */
const convertBrunoToOpenApi = ({ variables, items, name }) => {
  const components = {
    schemas: {},
    requestBodies: {},
    securitySchemes: {}
  };

  const servers = [];

  const addUrlToServersList = (url) => {
    if(!servers?.find(s => s?.url === url)) {
      servers.push({ url });
    }
  }

  const extractTagFromDepth = (item) => {
    const { pathname, depth } = item;
    if (!pathname) return;

    const parts = pathname.split('\\'); 
    const baseDepth = parts.length - depth;
    if (depth === 1) return "";

    const tagIndex = Math.max(baseDepth, 0);

    return parts[tagIndex];
  }

  const generatePaths = () => {
    const _items = items.map((item) => {
      let url = interpolate(item?.request?.url, variables);
      if (isValidUrl(url)) {
        let urlDetails = new URL(url);
        urlDetails?.pathname && (url = urlDetails?.pathname);
        urlDetails?.origin && addUrlToServersList(urlDetails?.origin);
      }
      const { request } = item;
      const { method, params, headers, body, auth } = request || {};

      // PARAMS
      const pathParamsRegex = /(?<!{){([^{}]+)}(?!})/g;
      const pathMatches = url.match(pathParamsRegex) || [];

      const parameters = [
        ...params?.map((param) => ({
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
        ...pathMatches?.map((path) => ({
          name: path.slice(1, path.length - 1),
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
              components.schemas[schemaId] = generateProperyShape(JSON.parse(body?.json));
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
            } catch (e) {
              console.error('Failed to parse JSON body:', e);
            }
            break;
          case 'xml':
            if (!body?.xml) break;
            components.schemas[schemaId] = generateProperyShape(xmlToJson(body?.xml));
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
            break;
          case 'multipartForm':
            if (!body?.multipartForm) break;
            let multipartFormToKeyValue = body?.multipartForm.reduce((acc, f) => {
              acc[f?.name] = f.value;
              return acc;
            }, {});
            components.schemas[schemaId] = generateProperyShape(multipartFormToKeyValue);
            components.requestBodies[requestBodyId] = {
              content: {
                'multipart/form-data': {
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
            break;
          case 'formUrlEncoded':
            if (!body?.formUrlEncoded) break;
            let formUrlEncodedToKeyValue = body?.formUrlEncoded.reduce((acc, f) => {
              acc[f?.name] = f.value;
              return acc;
            }, {});
            components.schemas[schemaId] = generateProperyShape(formUrlEncodedToKeyValue);
            components.requestBodies[requestBodyId] = {
              content: {
                'application/x-www-form-urlencoded': {
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
              type: 'apiKey',
              name: 'Authorization',
              in: 'header',
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
        data: pathBody
      };
    });

    return _items.reduce((acc, item) => {
      if (!acc[item?.url]) {
        acc[item?.url] = {};
      }
      acc[item?.url][item?.method] = item?.data;
      return acc;
    }, {});
  };

  const collectionToExport = {};
  collectionToExport.openapi = '3.0.0';
  collectionToExport.info = generateInfoSection(name);
  collectionToExport.paths = generatePaths();
  collectionToExport.servers = servers;
  collectionToExport.components = components;

  let yamlOutput = yaml.dump(collectionToExport);

  return yamlOutput;
};

module.exports = {
  convertBrunoToOpenApi
}; 