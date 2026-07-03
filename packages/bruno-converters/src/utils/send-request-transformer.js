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

// Postman response methods/props -> Bruno (axios-shaped) response equivalents.
// Used both for callback bodies and for promise-chain .then() handlers.
const responsePropertyMap = {
  json: 'data',
  text: 'data',
  code: 'status',
  status: 'statusText'
};

/**
 * Rewrite Postman response property references (response.json(), response.code, ...)
 * to their Bruno equivalents (response.data, response.status, ...) within a body.
 * @param {Object} j - jscodeshift API
 * @param {Object} body - AST node to search within (block statement or expression)
 * @param {string} responseVarName - Identifier name bound to the response object
 */
const transformResponseProperties = (j, body, responseVarName) => {
  j(body).find(j.MemberExpression, {
    object: {
      type: 'Identifier',
      name: responseVarName
    }
  }).forEach((memberPath) => {
    const property = memberPath.node.property;

    // Handle property access
    if (property.type === 'Identifier' && responsePropertyMap[property.name]) {
      const bruProperty = responsePropertyMap[property.name];
      if (bruProperty) {
        // Check if memberPath is part of a CallExpression
        const parentPath = memberPath.parent;
        if (parentPath && parentPath.node.type === 'CallExpression' && parentPath.node.callee === memberPath.node) {
          // Replace the entire CallExpression with a property access
          j(parentPath).replaceWith(
            j.memberExpression(
              j.identifier(responseVarName),
              j.identifier(bruProperty)
            )
          );
        } else {
          // Regular property access replacement
          j(memberPath).replaceWith(
            j.memberExpression(
              j.identifier(responseVarName),
              j.identifier(bruProperty)
            )
          );
        }
      }
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

  // Process the callback body to transform response property references
  transformResponseProperties(j, callbackBody, responseVarName);

  // Create the callback block
  return j.functionExpression(
    null,
    [j.identifier(errorVarName), j.identifier(responseVarName)],
    j.blockStatement(callbackBody.body)
  );
};

// Promise-chain methods that can follow pm.sendRequest(...).
const PROMISE_CHAIN_METHODS = new Set(['then', 'catch', 'finally']);

/**
 * Given a call NodePath, return the next `.then/.catch/.finally(...)` link that
 * chains off it, or null if the chain ends here. A link is only recognised when
 * our call is the object of a promise-method member that is itself being called
 * (e.g. `<call>.then(...)`), not when the call is merely an argument elsewhere.
 * @param {Object} callPath - NodePath of a CallExpression in the chain
 * @returns {{ callPath: Object, methodName: string } | null}
 */
const nextPromiseChainLink = (callPath) => {
  const memberPath = callPath.parent;
  if (!memberPath || !memberPath.value || memberPath.value.type !== 'MemberExpression') return null;
  // Ensure our call is the object being chained on (not e.g. an argument)
  if (memberPath.value.object !== callPath.value) return null;

  const property = memberPath.value.property;
  const methodName = property && (property.name || property.value);
  if (!PROMISE_CHAIN_METHODS.has(methodName)) return null;

  const outerCallPath = memberPath.parent;
  if (!outerCallPath || !outerCallPath.value || outerCallPath.value.type !== 'CallExpression') return null;
  if (outerCallPath.value.callee !== memberPath.value) return null;

  return { callPath: outerCallPath, methodName };
};

/**
 * Walk the promise chain that follows a pm.sendRequest(...) call, e.g.
 *   pm.sendRequest(cfg).then(res => ...).catch(err => ...)
 *
 * @param {Object} sendRequestCallPath - NodePath of the pm.sendRequest(...) CallExpression
 * @returns {{ isChain: boolean, outermostPath: Object, thenHandlers: Array }}
 */
const collectPromiseChain = (sendRequestCallPath) => {
  const thenHandlers = [];
  let current = sendRequestCallPath;
  let isChain = false;

  for (let link = nextPromiseChainLink(current); link; link = nextPromiseChainLink(current)) {
    isChain = true;

    // The onFulfilled handler receives the response object; .then(onFulfilled, onRejected)
    if (link.methodName === 'then') {
      const handler = link.callPath.value.arguments[0];
      if (handler) thenHandlers.push(handler);
    }

    current = link.callPath;
  }

  return { isChain, outermostPath: current, thenHandlers };
};

/**
 * Translate the response references inside a promise-chain .then() handler,
 * preserving the handler's original shape (arrow/function, param name).
 * @param {Object} j - jscodeshift API
 * @param {Object} handler - The onFulfilled handler node
 */
const transformPromiseHandler = (j, handler) => {
  if (!handler || (handler.type !== 'FunctionExpression' && handler.type !== 'ArrowFunctionExpression')) return;

  const params = handler.params;
  // The first parameter is bound to the response object
  if (!params.length || params[0].type !== 'Identifier') return;

  // Root the search at the handler (not handler.body): for concise arrow bodies
  // like `res => res.json()` the body itself is the node being replaced, and it
  // needs a parent path within the searched collection.
  transformResponseProperties(j, handler, params[0].name);
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

const FUNCTION_NODE_TYPES = new Set(['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression']);

/**
 * Mark the function that encloses this path as async, so an `await` we add on
 * the sendRequest call is syntactically valid (e.g. when the call sits inside a
 * forEach callback, a named helper, a pm.test body, or another .then handler).
 * @param {Object} path - NodePath of the pm.sendRequest MemberExpression
 */
const markEnclosingFunctionAsync = (path) => {
  let current = path.parent;
  while (current) {
    const node = current.value;
    if (node && FUNCTION_NODE_TYPES.has(node.type)) {
      node.async = true;
      return;
    }
    current = current.parent;
  }
};

const sendRequestTransformer = (path, j) => {
  const callExpr = path.parent.value;
  if (callExpr.type !== 'CallExpression') return;

  // Clone the argument object for modification
  const args = [...callExpr.arguments];
  if (!args.length) return;

  const requestOptions = args[0];
  const callback = args[1];

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

  // Handle promise-based usage: pm.sendRequest(cfg).then(...).catch(...)
  // bru.sendRequest returns a promise resolving to an axios-shaped response, so
  // the chain works as-is once the response references are translated and the
  // whole chain (not just the inner call) is awaited.
  const chain = collectPromiseChain(path.parent);
  if (chain.isChain) {
    // Translate response references (res.json() -> res.data, ...) in each .then handler
    chain.thenHandlers.forEach((handler) => transformPromiseHandler(j, handler));

    // Await the entire chain once, unless the caller already awaited it.
    const outermostPath = chain.outermostPath;
    const alreadyAwaited = outermostPath.parent
      && outermostPath.parent.value
      && outermostPath.parent.value.type === 'AwaitExpression';
    if (!alreadyAwaited) {
      // Ensure the enclosing function is async before adding the await.
      markEnclosingFunctionAsync(path);
      j(outermostPath).replaceWith(j.awaitExpression(outermostPath.value));
    }

    // Replace only the inner call with bru.sendRequest(...); the .then/.catch
    // chain wrapping it is preserved by the surrounding AST.
    return j.callExpression(
      j.identifier('bru.sendRequest'),
      args
    );
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

    if (wasAwaited) return sendRequestCall;
    // Ensure the enclosing function is async before adding the await.
    markEnclosingFunctionAsync(path);
    return j.awaitExpression(sendRequestCall);
  }

  // If there's no callback, just transform to await bru.sendRequest
  const sendRequestCall = j.callExpression(
    j.identifier('bru.sendRequest'),
    [requestOptions]
  );

  if (wasAwaited) return sendRequestCall;
  // Ensure the enclosing function is async before adding the await.
  markEnclosingFunctionAsync(path);
  return j.awaitExpression(sendRequestCall);
};

export default sendRequestTransformer;
