/**
 * Convert Postman header array format to Bruno headers object
 * @param {Object} j - jscodeshift API
 * @param {Object} arrayValue - Array expression of key-value pair objects
 * @returns {Object} - Object expression with key-value pairs
 */
const convertArrayToObject = (j, arrayValue) => {
  const obj = j.objectExpression([]);

  if (arrayValue.type === 'ArrayExpression') {
    arrayValue.elements.forEach((elem) => {
      if (elem.type === 'ObjectExpression') {
        const keyProp = elem.properties.find((p) => (p.key.name === 'key' || p.key.value === 'key'));
        const valueProp = elem.properties.find((p) => (p.key.name === 'value' || p.key.value === 'value'));

        if (keyProp && valueProp) {
          obj.properties.push(
            j.property(
              'init',
              j.literal(keyProp.value.value),
              valueProp.value
            )
          );
        }
      }
    });
  }

  return obj;
};

/**
 * Add or update a specific header in the request options
 * @param {Object} j - jscodeshift API
 * @param {Object} requestOptions - Request options object
 * @param {string} headerName - Header name to add/update
 * @param {string} headerValue - Header value
 */
const addOrUpdateHeader = (j, requestOptions, headerName, headerValue) => {
  let headersProp = requestOptions.properties.find((p) => (p.key.name === 'headers' || p.key.value === 'headers'));

  if (!headersProp) {
    headersProp = j.property('init', j.identifier('headers'), j.objectExpression([]));
    requestOptions.properties.push(headersProp);
  } else if (headersProp.value.type !== 'ObjectExpression') {
    headersProp.value = j.objectExpression([]);
  }

  // filter out existing header with same name (case-insensitive)
  headersProp.value.properties = headersProp.value.properties.filter((p) =>
    p.key.type !== 'Literal'
    || p.key.value.toLowerCase() !== headerName.toLowerCase()
  );

  headersProp.value.properties.push(
    j.property(
      'init',
      j.literal(headerName),
      j.literal(headerValue)
    )
  );
};

/**
 * Transform headers property from array to object format
 * @param {Object} j - jscodeshift API
 * @param {Object} requestOptions - Request options object
 */
const transformHeaders = (j, requestOptions) => {
  if (requestOptions.type !== 'ObjectExpression') return;

  requestOptions.properties.forEach((prop) => {
    // find and rename 'header' property to 'headers'
    if (prop.key.name === 'header' || prop.key.value === 'header') {
      prop.key.name = 'headers';
      prop.key.value = 'headers';

      // Handle array of header objects
      if (prop.value.type === 'ArrayExpression') {
        prop.value = convertArrayToObject(j, prop.value);
      }
    }
  });
};

/**
 * Transform body property based on body mode
 * @param {Object} j - jscodeshift API
 * @param {Object} requestOptions - Request options object
 * @returns {Array|null} - Array of statements if formdata is used, null otherwise
 */
const transformBody = (j, requestOptions) => {
  if (requestOptions.type !== 'ObjectExpression') return null;

  requestOptions.properties.forEach((prop) => {
    if (prop.key.name === 'body' || prop.key.value === 'body') {
      if (prop.value.type === 'ObjectExpression') {
        const bodyProps = prop.value.properties;
        const modeProp = bodyProps.find((p) => (p.key.name === 'mode' || p.key.value === 'mode'));

        if (modeProp && modeProp.value.type === 'Literal') {
          const bodyMode = modeProp.value.value;

          // Handle raw mode (text, json, xml, etc.)
          if (bodyMode === 'raw') {
            const rawProp = bodyProps.find((p) => (p.key.name === 'raw' || p.key.value === 'raw'));

            if (rawProp) {
              // Replace body with data
              prop.key.name = 'data';
              prop.key.value = 'data';
              prop.value = rawProp.value;
            }
          } else if (bodyMode === 'urlencoded') {
            // Handle urlencoded mode
            const urlencodedProp = bodyProps.find((p) => (p.key.name === 'urlencoded' || p.key.value === 'urlencoded') && p.value.type === 'ArrayExpression');

            if (urlencodedProp) {
              // Replace the body property with a 'data' property
              prop.key.name = 'data';
              prop.key.value = 'data';

              // Transform the urlencoded array to an object
              prop.value = convertArrayToObject(j, urlencodedProp.value);

              // Add Content-Type header for urlencoded
              addOrUpdateHeader(j, requestOptions, 'Content-Type', 'application/x-www-form-urlencoded');
            }
          } else if (bodyMode === 'formdata') {
            // Handle formdata mode
            const formdataProp = bodyProps.find((p) => (p.key.name === 'formdata' || p.key.value === 'formdata') && p.value.type === 'ArrayExpression');

            if (formdataProp) {
              // Replace the body property with a 'data' property
              prop.key.name = 'data';
              prop.key.value = 'data';

              // Transform the urlencoded array to an object
              prop.value = convertArrayToObject(j, formdataProp.value);

              // Add Content-Type header for urlencoded
              addOrUpdateHeader(j, requestOptions, 'Content-Type', 'multipart/form-data');
            }
          }
        }
      }
    }
  });
};

// Postman's response API vs Bruno's axios-shaped response. json()/text() are
// methods on the Postman response but already-parsed properties on Bruno's.
const responsePropertyMap = {
  json: 'data',
  text: 'data',
  code: 'status',
  status: 'statusText'
};

/**
 * Rewrite Postman response property/method access to its Bruno equivalent
 * @param {Object} j - jscodeshift API
 * @param {Object} body - Function body to rewrite in place
 * @param {string} responseVarName - Name the response is bound to
 */
const rewriteResponsePropertyAccess = (j, body, responseVarName) => {
  j(body).find(j.MemberExpression, {
    object: {
      type: 'Identifier',
      name: responseVarName
    }
  }).forEach((memberPath) => {
    const property = memberPath.node.property;
    if (property.type !== 'Identifier') return;

    const bruProperty = responsePropertyMap[property.name];
    if (!bruProperty) return;

    const replacement = j.memberExpression(
      j.identifier(responseVarName),
      j.identifier(bruProperty)
    );

    // response.json() collapses to response.data — the call goes away with it.
    // Only when the member is the callee: in console.log(response.code) the
    // parent is also a CallExpression, and replacing it would eat the log.
    const parentPath = memberPath.parent;
    if (parentPath && parentPath.node.type === 'CallExpression' && parentPath.node.callee === memberPath.node) {
      j(parentPath).replaceWith(replacement);
    } else {
      j(memberPath).replaceWith(replacement);
    }
  });
};

/**
 * Transform callback function to Bruno format
 * @param {Object} j - jscodeshift API
 * @param {Object} callback - Callback function expression
 * @returns {Object} - Transformed callback function
 */
const transformCallback = (j, callback) => {
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

  rewriteResponsePropertyAccess(j, callbackBody, responseVarName);

  // Create the callback block
  return j.functionExpression(
    null,
    [j.identifier(errorVarName), j.identifier(responseVarName)],
    j.blockStatement(callbackBody.body)
  );
};

const PROMISE_CHAIN_METHODS = new Set(['then', 'catch', 'finally']);

/**
 * Get the `.then`/`.catch`/`.finally` member expression a call is chained into
 * @param {Object} callPath - Path of the CallExpression
 * @returns {Object|null} - Path of the chaining MemberExpression, or null
 */
export const getChainedPromiseMemberPath = (callPath) => {
  const parent = callPath.parent;
  if (!parent || parent.value.type !== 'MemberExpression') return null;
  if (parent.value.object !== callPath.value) return null;

  const property = parent.value.property;
  const name = property.type === 'Identifier' ? property.name : property.value;
  return PROMISE_CHAIN_METHODS.has(name) ? parent : null;
};

/**
 * Rewrite response access inside the handlers of a `.then(...).catch(...)` chain
 * hanging off the given call. Only `.then`'s first handler receives the
 * response; `.catch`/`.finally` handlers receive an error or nothing.
 * @param {Object} j - jscodeshift API
 * @param {Object} callPath - Path of the CallExpression the chain hangs off
 */
const transformPromiseChainHandlers = (j, callPath) => {
  let currentPath = callPath;
  let memberPath = getChainedPromiseMemberPath(currentPath);

  while (memberPath) {
    const chainedCallPath = memberPath.parent;
    if (!chainedCallPath || chainedCallPath.value.type !== 'CallExpression') return;

    const property = memberPath.value.property;
    const methodName = property.type === 'Identifier' ? property.name : property.value;
    const handler = chainedCallPath.value.arguments[0];

    if (
      methodName === 'then'
      && handler
      && (handler.type === 'FunctionExpression' || handler.type === 'ArrowFunctionExpression')
      && handler.params[0]?.type === 'Identifier'
    ) {
      rewriteResponsePropertyAccess(j, handler.body, handler.params[0].name);
    }

    currentPath = chainedCallPath;
    memberPath = getChainedPromiseMemberPath(currentPath);
  }
};

/**
 * Find and transform variable declaration for request config
 * @param {Object} j - jscodeshift API
 * @param {Object} root - Root AST node
 * @param {string} variableName - Name of the variable to find
 * @param {Set} visited - Set of visited variable names to prevent infinite loops
 * @returns {Object|null} - Transformed object expression or null if not found
 */
const findAndTransformVariableDeclaration = (j, root, variableName, visited = new Set()) => {
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
      // Found the actual object expression - clone and transform it
      const configClone = j(init).at(0).get().value;

      // Transform headers and body
      transformHeaders(j, configClone);
      transformBody(j, configClone);

      transformedConfig = configClone;
    } else if (init && init.type === 'Identifier') {
      // This variable references another variable - follow the chain
      const referencedVariableName = init.name;
      transformedConfig = findAndTransformVariableDeclaration(j, root, referencedVariableName, visited);
    }
  });

  return transformedConfig;
};

const sendRequestTransformer = (path, j) => {
  const callExpr = path.parent.value;
  if (callExpr.type !== 'CallExpression') return;

  // Clone the argument object for modification
  const args = [...callExpr.arguments];
  if (!args.length) return;

  const requestOptions = args[0];
  const callback = args[1];

  // A chained call keeps its promise; awaiting here would resolve the response
  // and leave `.then` on a non-thenable. awaitSendRequestChains in the
  // translator wraps the outermost chain instead.
  const isChained = getChainedPromiseMemberPath(path.parent) !== null;

  // Check if original call was awaited
  const wasAwaited = path.parent.parent.value.type === 'AwaitExpression';

  // transform the request config options
  if (requestOptions.type === 'ObjectExpression') {
    // Transform headers
    transformHeaders(j, requestOptions);
    // Transform body
    transformBody(j, requestOptions);
  } else if (requestOptions.type === 'Identifier') {
    // Handle case where requestOptions is a variable reference
    const variableName = requestOptions.name;

    // Find the root of the current file/program
    const root = j(path).closest(j.Program);

    // Find and transform the variable declaration
    findAndTransformVariableDeclaration(j, root, variableName);
  }

  if (isChained) {
    transformPromiseChainHandlers(j, path.parent);
  }

  // Create the callback block and promise chain if there's a callback
  if (callback) {
    const transformedCallback = transformCallback(j, callback);

    // Add async keyword to the callback function
    if (transformedCallback && (transformedCallback.type === 'FunctionExpression' || transformedCallback.type === 'ArrowFunctionExpression')) {
      transformedCallback.async = true;
    }

    // Create expression: await bru.sendRequest(requestConfig, callback);
    const sendRequestCall = j.callExpression(
      j.identifier('bru.sendRequest'),
      transformedCallback ? [requestOptions, transformedCallback] : [requestOptions]
    );

    return wasAwaited || isChained ? sendRequestCall : j.awaitExpression(sendRequestCall);
  }

  // If there's no callback, just transform to await bru.sendRequest
  const sendRequestCall = j.callExpression(
    j.identifier('bru.sendRequest'),
    [requestOptions]
  );

  return wasAwaited || isChained ? sendRequestCall : j.awaitExpression(sendRequestCall);
};

export default sendRequestTransformer;
