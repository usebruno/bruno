const j = require('jscodeshift');

/**
 * Content-Type constants for body mode detection
 * @readonly
 */
const CONTENT_TYPES = Object.freeze({
  URLENCODED: 'application/x-www-form-urlencoded',
  FORMDATA: 'multipart/form-data'
});

/**
 * Body mode constants
 * @readonly
 */
const BODY_MODES = Object.freeze({
  RAW: 'raw',
  URLENCODED: 'urlencoded',
  FORMDATA: 'formdata'
});

/**
 * Convert Bruno object format to Postman array format for body
 * @param {Object} objectValue - Object expression with key-value pairs
 * @returns {Object} - Array expression of key-value pair objects
 */
const convertObjectToArray = (objectValue) => {
  const arr = j.arrayExpression([]);

  if (objectValue.type === 'ObjectExpression') {
    objectValue.properties.forEach((prop) => {
      // Handle spread operators (e.g., ...rest)
      if (prop.type === 'SpreadElement' || prop.type === 'SpreadProperty') {
        // For spread operators, we need to spread the array at runtime
        // Convert the spread expression to spread the result of Object.entries().map()
        // This preserves the spread behavior in Postman format
        // Object.entries(rest).map(([key, value]) => ({key, value}))
        arr.elements.push(
          j.spreadElement(
            j.callExpression(
              j.memberExpression(
                j.callExpression(
                  j.memberExpression(j.identifier('Object'), j.identifier('entries')),
                  [prop.argument]
                ),
                j.identifier('map')
              ),
              [
                j.arrowFunctionExpression(
                  [j.arrayPattern([j.identifier('key'), j.identifier('value')])],
                  j.objectExpression([
                    j.property('init', j.identifier('key'), j.identifier('key')),
                    j.property('init', j.identifier('value'), j.identifier('value'))
                  ])
                )
              ]
            )
          )
        );
      } else {
        // Handle regular key-value properties
        // Skip if prop doesn't have a key (shouldn't happen, but defensive)
        if (!prop.key) return;

        const keyValue = prop.key.type === 'Literal' ? prop.key.value : prop.key.name;

        arr.elements.push(
          j.objectExpression([
            j.property('init', j.identifier('key'), j.literal(keyValue)),
            j.property('init', j.identifier('value'), prop.value)
          ])
        );
      }
    });
  }

  return arr;
};

/**
 * Get Content-Type from headers object
 * @param {Object} requestOptions - Request options object
 * @returns {string|null} - Content-Type value or null if not found
 */
const getContentType = (requestOptions) => {
  if (requestOptions.type !== 'ObjectExpression') return null;

  const headersProp = requestOptions.properties.find((p) =>
    (p.key.name === 'headers' || p.key.value === 'headers')
  );

  if (!headersProp || headersProp.value.type !== 'ObjectExpression') return null;

  const contentTypeProp = headersProp.value.properties.find((p) => {
    const keyName = p.key.type === 'Literal' ? p.key.value : p.key.name;
    return keyName && keyName.toLowerCase() === 'content-type';
  });

  if (contentTypeProp && contentTypeProp.value.type === 'Literal') {
    return contentTypeProp.value.value;
  }

  return null;
};

/**
 * Transform headers property from Bruno format to Postman format
 * Rename 'headers' to 'header'
 * @param {Object} requestOptions - Request options object
 */
const transformHeaders = (requestOptions) => {
  if (requestOptions.type !== 'ObjectExpression') return;

  requestOptions.properties.forEach((prop) => {
    // Find and rename 'headers' property to 'header'
    if (prop.key.name === 'headers' || prop.key.value === 'headers') {
      prop.key = j.identifier('header');
    }
  });
};

/**
 * Create a raw body object expression
 * @param {Object} dataValue - The data value to wrap
 * @returns {Object} - Object expression with raw mode
 */
const createRawBody = (dataValue) => {
  return j.objectExpression([
    j.property('init', j.identifier('mode'), j.literal(BODY_MODES.RAW)),
    j.property('init', j.identifier('raw'), dataValue)
  ]);
};

/**
 * Determine body mode based on Content-Type header
 * @param {string|null} contentType - Content-Type header value
 * @returns {string} - Body mode: 'urlencoded', 'formdata', or 'raw'
 */
const determineBodyMode = (contentType) => {
  if (!contentType) return BODY_MODES.RAW;

  const normalizedContentType = contentType.toLowerCase();
  if (normalizedContentType.includes(CONTENT_TYPES.URLENCODED)) {
    return BODY_MODES.URLENCODED;
  }
  if (normalizedContentType.includes(CONTENT_TYPES.FORMDATA)) {
    return BODY_MODES.FORMDATA;
  }
  return BODY_MODES.RAW;
};

/**
 * Transform body/data property from Bruno format to Postman format
 * @param {Object} requestOptions - Request options object
 * @param {string|null} contentType - Content-Type header value (passed in because headers may be renamed)
 */
const transformBody = (requestOptions, contentType) => {
  if (requestOptions.type !== 'ObjectExpression') return;

  requestOptions.properties.forEach((prop) => {
    if (prop.key.name === 'data' || prop.key.value === 'data') {
      const dataValue = prop.value;
      const bodyMode = determineBodyMode(contentType);

      // Rename 'data' to 'body'
      prop.key = j.identifier('body');

      // Convert to Postman body format based on mode
      if (bodyMode === BODY_MODES.URLENCODED && dataValue.type === 'ObjectExpression') {
        prop.value = j.objectExpression([
          j.property('init', j.identifier('mode'), j.literal(BODY_MODES.URLENCODED)),
          j.property('init', j.identifier('urlencoded'), convertObjectToArray(dataValue))
        ]);
      } else if (bodyMode === BODY_MODES.FORMDATA && dataValue.type === 'ObjectExpression') {
        prop.value = j.objectExpression([
          j.property('init', j.identifier('mode'), j.literal(BODY_MODES.FORMDATA)),
          j.property('init', j.identifier('formdata'), convertObjectToArray(dataValue))
        ]);
      } else {
        // Default to raw mode (for non-object values or unrecognized Content-Type)
        prop.value = createRawBody(dataValue);
      }
    }
  });
};

/**
 * Transform callback function to Postman format
 * @param {Object} callback - Callback function expression
 * @returns {Object} - Transformed callback function
 */
const transformCallback = (callback) => {
  if (!callback || (callback.type !== 'FunctionExpression' && callback.type !== 'ArrowFunctionExpression')) return null;

  const params = callback.params;
  const callbackBody = callback.body;

  // Get the response parameter name (typically the second param)
  let responseVarName = 'response'; // Default if not found
  if (params.length >= 2 && params[1].type === 'Identifier') {
    responseVarName = params[1].name;
  }

  let errorVarName = 'error'; // Default if not found
  if (params.length >= 1 && params[0].type === 'Identifier') {
    errorVarName = params[0].name;
  }

  // Define translations for callback response properties (Bruno -> Postman)
  const responsePropertyMap = {
    data: 'json', // response.data -> response.json()
    status: 'code', // response.status -> response.code
    statusText: 'status' // response.statusText -> response.status
  };

  // Process the callback body to transform response property references
  j(callbackBody).find(j.MemberExpression, {
    object: {
      type: 'Identifier',
      name: responseVarName
    }
  }).forEach((memberPath) => {
    const property = memberPath.node.property;

    // Handle property access
    if (property.type === 'Identifier' && responsePropertyMap[property.name]) {
      const pmProperty = responsePropertyMap[property.name];

      if (property.name === 'data') {
        // response.data -> response.json() (convert to method call)
        j(memberPath).replaceWith(
          j.callExpression(
            j.memberExpression(
              j.identifier(responseVarName),
              j.identifier(pmProperty)
            ),
            []
          )
        );
      } else {
        // Regular property replacement (status -> code, statusText -> status)
        j(memberPath).replaceWith(
          j.memberExpression(
            j.identifier(responseVarName),
            j.identifier(pmProperty)
          )
        );
      }
    }
  });

  // Create the callback - Postman uses regular functions
  const bodyStatements = callbackBody.type === 'BlockStatement' ? callbackBody.body : [j.returnStatement(callbackBody)];
  const functionExpr = j.functionExpression(
    null,
    [j.identifier(errorVarName), j.identifier(responseVarName)],
    j.blockStatement(bodyStatements)
  );

  functionExpr.async = callback.async;

  return functionExpr;
};

/**
 * Find and transform variable declaration for request config
 * @param {Object} root - Root AST node (jscodeshift collection)
 * @param {string} variableName - Name of the variable to find
 * @param {Set} visited - Set of visited variable names to prevent infinite loops
 * @returns {Object|null} - Transformed object expression or null if not found
 */
const findAndTransformVariableDeclaration = (root, variableName, visited = new Set()) => {
  // Prevent infinite loops from circular references
  if (visited.has(variableName)) {
    return null;
  }
  visited.add(variableName);

  let transformedConfig = null;

  // Find the variable declaration
  root.find(j.VariableDeclarator, {
    id: { name: variableName }
  }).forEach((declaratorPath) => {
    const init = declaratorPath.value.init;

    if (init && init.type === 'ObjectExpression') {
      // Found the actual object expression - transform it in place
      // Get Content-Type BEFORE transforming headers (since we rename headers to header)
      const contentType = getContentType(init);
      transformHeaders(init);
      transformBody(init, contentType);

      transformedConfig = init;
    } else if (init && init.type === 'Identifier') {
      // This variable references another variable - follow the chain
      const referencedVariableName = init.name;
      transformedConfig = findAndTransformVariableDeclaration(root, referencedVariableName, visited);
    }
  });

  return transformedConfig;
};

/**
 * Build pm.sendRequest member expression
 * @returns {Object} - MemberExpression AST node
 */
const buildPmSendRequest = () => {
  return j.memberExpression(
    j.identifier('pm'),
    j.identifier('sendRequest')
  );
};

/**
 * Main transformer for bru.sendRequest -> pm.sendRequest
 * @param {Object} path - AST path to the CallExpression
 * @returns {Object|null} - Transformed call expression or null
 */
const bruSendRequestTransformer = (path) => {
  const callExpr = path.value;
  if (callExpr.type !== 'CallExpression') return null;

  // Clone the arguments for modification
  const args = [...callExpr.arguments];
  if (!args.length) {
    // No arguments, just replace the callee
    return j.callExpression(buildPmSendRequest(), []);
  }

  const requestOptions = args[0];
  const callback = args[1];

  // Transform the request config options
  if (requestOptions.type === 'ObjectExpression') {
    // Get Content-Type BEFORE transforming headers (since we rename headers to header)
    const contentType = getContentType(requestOptions);
    // Transform headers
    transformHeaders(requestOptions);
    // Transform body
    transformBody(requestOptions, contentType);
  } else if (requestOptions.type === 'Identifier') {
    // Handle case where requestOptions is a variable reference
    const variableName = requestOptions.name;

    // Find the root of the current file/program
    const root = j(path).closest(j.Program);

    // Find and transform the variable declaration
    findAndTransformVariableDeclaration(root, variableName);
  }

  // Transform callback if present
  let transformedArgs = [requestOptions];
  if (callback) {
    const transformedCallback = transformCallback(callback);
    if (transformedCallback) {
      transformedArgs.push(transformedCallback);
    } else {
      transformedArgs.push(callback);
    }
  }

  // Create pm.sendRequest call
  return j.callExpression(buildPmSendRequest(), transformedArgs);
};

export default bruSendRequestTransformer;
