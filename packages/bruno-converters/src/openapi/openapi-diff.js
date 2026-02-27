import { HTTP_METHODS, normalizePath } from '../utils/openapi-utils';

const generateEndpointId = (method, path) => {
  const normalizedPath = normalizePath(path);
  return `${method.toUpperCase()}:${normalizedPath}`;
};

/**
 * Extract parameters from an operation, categorized by location (path, query, header)
 */
const extractParameters = (operation) => {
  const parameters = {
    path: [],
    query: [],
    header: []
  };

  if (!operation?.parameters || !Array.isArray(operation.parameters)) {
    return parameters;
  }

  operation.parameters.forEach((param) => {
    if (!param || !param.name || !param.in) return;

    const paramInfo = {
      name: param.name,
      type: param.schema?.type || param.type || 'string',
      required: param.required || false,
      description: param.description || null
    };

    const location = param.in.toLowerCase();
    if (parameters[location]) {
      parameters[location].push(paramInfo);
    }
  });

  return parameters;
};

/**
 * Extract request body information from an operation
 */
const extractRequestBody = (operation) => {
  if (!operation?.requestBody) {
    return null;
  }

  const requestBody = operation.requestBody;
  const content = requestBody.content || {};
  const contentTypes = Object.keys(content);
  const primaryContentType = contentTypes[0] || null;
  const primaryContent = primaryContentType ? content[primaryContentType] : null;

  return {
    required: requestBody.required || false,
    contentType: primaryContentType,
    schema: primaryContent?.schema || null,
    description: requestBody.description || null
  };
};

/**
 * Extract response definitions from an operation
 */
const extractResponses = (operation) => {
  if (!operation?.responses) {
    return [];
  }

  return Object.entries(operation.responses).map(([code, response]) => {
    const content = response?.content || {};
    const contentTypes = Object.keys(content);
    const primaryContentType = contentTypes[0] || null;
    const primaryContent = primaryContentType ? content[primaryContentType] : null;

    return {
      code,
      description: response?.description || null,
      schema: primaryContent?.schema || null
    };
  });
};

/**
 * Generate a hash for an operation based on parameters, requestBody, and responses
 * Used for quick comparison to detect modifications
 */
const generateHash = (operation) => {
  const params = extractParameters(operation);
  // Sort params by name within each category for stable comparison
  Object.keys(params).forEach((k) => {
    params[k].sort((a, b) => a.name.localeCompare(b.name));
  });

  // Sort responses by status code for stable comparison
  const responses = extractResponses(operation).sort((a, b) => a.code.localeCompare(b.code));

  const hashData = {
    parameters: params,
    requestBody: extractRequestBody(operation),
    responses,
    deprecated: operation?.deprecated || false
  };

  return JSON.stringify(hashData);
};

const extractEndpoints = (spec) => {
  const endpoints = [];

  if (!spec || !spec.paths) {
    return endpoints;
  }

  Object.entries(spec.paths).forEach(([path, methods]) => {
    if (!methods || typeof methods !== 'object') return;

    Object.entries(methods).forEach(([method, operation]) => {
      if (!HTTP_METHODS.includes(method.toLowerCase())) return;

      const endpoint = {
        id: generateEndpointId(method, path),
        method: method.toUpperCase(),
        path: path,
        normalizedPath: normalizePath(path),
        operationId: operation?.operationId || null,
        summary: operation?.summary || null,
        description: operation?.description || null,
        tags: operation?.tags || [],
        deprecated: operation?.deprecated || false,
        details: {
          parameters: extractParameters(operation),
          requestBody: extractRequestBody(operation),
          responses: extractResponses(operation)
        },
        _hash: generateHash(operation)
      };

      endpoints.push(endpoint);
    });
  });

  return endpoints;
};

const diffSpecs = (oldSpec, newSpec) => {
  const oldEndpoints = extractEndpoints(oldSpec);
  const newEndpoints = extractEndpoints(newSpec);

  const oldEndpointMap = new Map(oldEndpoints.map((ep) => [ep.id, ep]));
  const newEndpointMap = new Map(newEndpoints.map((ep) => [ep.id, ep]));

  const added = [];
  const removed = [];
  const modified = [];
  const unchanged = [];

  newEndpoints.forEach((endpoint) => {
    if (!oldEndpointMap.has(endpoint.id)) {
      added.push(endpoint);
    } else {
      const oldEndpoint = oldEndpointMap.get(endpoint.id);
      if (oldEndpoint._hash !== endpoint._hash) {
        modified.push({
          ...endpoint,
          oldEndpoint: oldEndpoint
        });
      } else {
        unchanged.push(endpoint);
      }
    }
  });

  oldEndpoints.forEach((endpoint) => {
    if (!newEndpointMap.has(endpoint.id)) {
      removed.push(endpoint);
    }
  });

  return {
    added,
    removed,
    modified,
    unchanged,
    hasChanges: added.length > 0 || removed.length > 0 || modified.length > 0
  };
};

export {
  extractEndpoints,
  diffSpecs,
  generateEndpointId
};
