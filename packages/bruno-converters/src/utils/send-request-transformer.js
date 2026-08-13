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

const PROMISE_CHAIN_METHODS = new Set(['then', 'catch', 'finally']);

/**
 * Get the statically-known property name of a member expression. A computed
 * access with a non-literal key (`p[someVar]`) has no static name — even an
 * Identifier key named `then` is a variable there, not the method.
 * @param {Object} memberExpr - MemberExpression node
 * @returns {string|null}
 */
const getStaticPropertyName = (memberExpr) => {
  const property = memberExpr.property;

  if (memberExpr.computed) {
    return property.type === 'Literal' && typeof property.value === 'string' ? property.value : null;
  }
  return property.type === 'Identifier' ? property.name : null;
};

/**
 * Collect the `.then`/`.catch`/`.finally` calls chained off the given call,
 * innermost first.
 * @param {Object} callPath - Path of the CallExpression the chain hangs off
 * @returns {Array<{callPath: Object, methodName: string}>}
 */
const getPromiseChainLinks = (callPath) => {
  const links = [];
  let currentPath = callPath;

  while (true) {
    const memberPath = currentPath.parent;
    if (!memberPath || memberPath.value.type !== 'MemberExpression') break;
    if (memberPath.value.object !== currentPath.value) break;

    const methodName = getStaticPropertyName(memberPath.value);
    if (!PROMISE_CHAIN_METHODS.has(methodName)) break;

    const chainedCallPath = memberPath.parent;
    if (!chainedCallPath || chainedCallPath.value.type !== 'CallExpression') break;

    links.push({ callPath: chainedCallPath, methodName });
    currentPath = chainedCallPath;
  }

  return links;
};

/**
 * Whether a function is a `.then`/`.catch`/`.finally` handler argument. Such a
 * handler's return value is already promise-wrapped by the chain, so turning it
 * async is transparent to its caller — unlike an arbitrary callback, where the
 * caller would start receiving a promise in place of the value it expects.
 * @param {Object} functionPath - Path of the function to test
 * @returns {boolean}
 */
const isPromiseChainHandler = (functionPath) => {
  const parent = functionPath.parent;
  if (!parent || parent.value.type !== 'CallExpression') return false;
  if (!parent.value.arguments.includes(functionPath.value)) return false;

  const callee = parent.value.callee;
  return callee.type === 'MemberExpression' && PROMISE_CHAIN_METHODS.has(getStaticPropertyName(callee));
};

/**
 * Whether `await` may be emitted at this position, turning the enclosing function
 * async where that is safe. Bruno evaluates scripts inside an async closure, so
 * top level is awaitable. Inside a non-async function `await` is a syntax error
 * that breaks the entire script, so it is emitted there only once the function
 * has been made async — which is only safe for a promise-chain handler.
 * @param {Object} j - jscodeshift API
 * @param {Object} path - Path the await would be emitted at
 * @returns {boolean}
 */
const makeAwaitable = (j, path) => {
  const enclosingFunction = j(path).closest(j.Function);

  const isTopLevel = enclosingFunction.size() === 0;
  if (isTopLevel) return true;

  const functionPath = enclosingFunction.get();
  if (functionPath.value.async === true) return true;
  if (isPromiseChainHandler(functionPath)) {
    functionPath.value.async = true;
    return true;
  }

  return false;
};

/**
 * Rewrite Postman response access on a handler's response parameter to its Bruno
 * equivalent (res.json() -> res.data, res.code -> res.status, ...). References
 * that resolve to a different binding — a nested function re-declaring the name —
 * are left alone.
 * @param {Object} j - jscodeshift API
 * @param {Object} handlerPath - Path of the `.then` fulfilled handler argument
 */
const rewriteThenHandlerResponseAccess = (j, handlerPath) => {
  const handler = handlerPath.value;
  if (!handler) return;
  if (handler.type !== 'FunctionExpression' && handler.type !== 'ArrowFunctionExpression') return;
  if (handler.params[0]?.type !== 'Identifier') return;

  const responseVarName = handler.params[0].name;

  j(handlerPath).find(j.MemberExpression, {
    object: {
      type: 'Identifier',
      name: responseVarName
    }
  }).forEach((memberPath) => {
    const property = memberPath.value.property;
    if (property.type !== 'Identifier') return;

    const bruProperty = responsePropertyMap[property.name];
    if (!bruProperty) return;

    // skip references shadowed by a nested re-declaration of the name
    const declaringScope = memberPath.scope.lookup(responseVarName);
    if (!declaringScope || declaringScope.node !== handler) return;

    const replacement = j.memberExpression(j.identifier(responseVarName), j.identifier(bruProperty));

    // response.json() collapses to response.data — the call goes away with it.
    // Only when the member is the callee: in console.log(response.code) the
    // parent is also a CallExpression, and replacing it would eat the log.
    const parentPath = memberPath.parent;
    if (parentPath.value.type === 'CallExpression' && parentPath.value.callee === memberPath.value) {
      j(parentPath).replaceWith(replacement);
    } else {
      j(memberPath).replaceWith(replacement);
    }
  });
};

/**
 * Whether an identifier reference inside a handler resolves to the handler's own
 * parameter rather than a nested re-declaration of the same name.
 * @param {Object} path - Path of the reference
 * @param {string} name - Parameter name
 * @param {Object} handler - Handler function node owning the parameter
 * @returns {boolean}
 */
const resolvesToHandlerParam = (path, name, handler) => {
  const declaringScope = path.scope.lookup(name);
  return Boolean(declaringScope) && declaringScope.node === handler;
};

/**
 * Whether every value the handler can return is its own response parameter, so the
 * next `.then` in the chain still receives the response. A path that falls through
 * to an implicit undefined does not qualify.
 * @param {Object} j - jscodeshift API
 * @param {Object} handlerPath - Path of the `.then` fulfilled handler argument
 * @returns {boolean}
 */
const returnsParamUnchanged = (j, handlerPath) => {
  const handler = handlerPath.value;
  const paramName = handler.params[0].name;
  const body = handler.body;

  // if the body is not a block statement then check if the body is an
  // identifier and the name is the same as the parameter name
  if (body.type !== 'BlockStatement') {
    return body.type === 'Identifier' && body.name === paramName;
  }

  // if the body is a block statement then check if the last statement is
  // a return statement and the argument is an identifier and the name is the same as the parameter name
  const lastStatement = body.body[body.body.length - 1];
  if (!lastStatement || lastStatement.type !== 'ReturnStatement') return false;

  // check if the return statement is the own return statement of the handler
  const ownReturns = j(handlerPath)
    .find(j.ReturnStatement)
    .paths()
    .filter((returnPath) => j(returnPath).closest(j.Function).get().value === handler);

  return ownReturns.every((returnPath) => {
    const argument = returnPath.value.argument;
    return argument
      && argument.type === 'Identifier'
      && argument.name === paramName
      && resolvesToHandlerParam(returnPath, paramName, handler);
  });
};

/**
 * Whether the handler rebinds its response parameter, so what it forwards is no
 * longer the response mapped for Bruno.
 * @param {Object} j - jscodeshift API
 * @param {Object} handlerPath - Path of the `.then` fulfilled handler argument
 * @returns {boolean}
 */
const isResponseParamReassigned = (j, handlerPath) => {
  const handler = handlerPath.value;
  const paramName = handler.params[0].name;

  const isRebind = (path, target) =>
    target.type === 'Identifier'
    && target.name === paramName
    && resolvesToHandlerParam(path, paramName, handler);

  const assigned = j(handlerPath)
    .find(j.AssignmentExpression)
    .paths()
    .some((path) => isRebind(path, path.value.left));

  if (assigned) return true;

  return j(handlerPath)
    .find(j.UpdateExpression)
    .paths()
    .some((path) => isRebind(path, path.value.argument));
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
  j(callbackBody).find(j.MemberExpression, {
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
        if (parentPath && parentPath.node.type === 'CallExpression') {
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

  // Create the callback block
  return j.functionExpression(
    null,
    [j.identifier(errorVarName), j.identifier(responseVarName)],
    j.blockStatement(callbackBody.body)
  );
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
  const callPath = path.parent;
  const callExpr = callPath.value;
  if (callExpr.type !== 'CallExpression') return;

  // Clone the argument object for modification
  const args = [...callExpr.arguments];
  if (!args.length) return;

  const requestOptions = args[0];
  const callback = args[1];

  // Check if original call was awaited
  const wasAwaited = callPath.parent.value.type === 'AwaitExpression';

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

  let transformedCallback = null;
  if (callback) {
    transformedCallback = transformCallback(j, callback);

    // always async — the body may await a nested bru.sendRequest
    if (transformedCallback) {
      transformedCallback.async = true;
    }
  }

  const sendRequestCall = j.callExpression(
    j.identifier('bru.sendRequest'),
    transformedCallback ? [requestOptions, transformedCallback] : [requestOptions]
  );

  if (wasAwaited) return sendRequestCall;

  const chainLinks = getPromiseChainLinks(callPath);

  if (!chainLinks.length) {
    return makeAwaitable(j, callPath) ? j.awaitExpression(sendRequestCall) : sendRequestCall;
  }

  // the innermost `.then` receives the response; each later handler does too only
  // while the one before it forwards its response parameter unchanged. `.catch` and
  // `.finally` handlers see an error or nothing, so the chain stops being traceable there.
  for (const link of chainLinks) {
    if (link.methodName !== 'then') break;

    const [handler] = link.callPath.value.arguments;
    if (!handler) break;
    if (handler.type !== 'FunctionExpression' && handler.type !== 'ArrowFunctionExpression') break;
    if (handler.params[0]?.type !== 'Identifier') break; // if the handler does not have a parameter then break

    const handlerPath = link.callPath.get('arguments', 0);

    // both read before the rewrite, which would collapse `return res.json()` into
    // `return res.data` and hide that the handler never forwarded the response
    const returnsResponse = returnsParamUnchanged(j, handlerPath);
    const reassignsResponse = isResponseParamReassigned(j, handlerPath);

    rewriteThenHandlerResponseAccess(j, handlerPath);

    if (!returnsResponse) break;
    if (reassignsResponse) break;
  }

  const outermostPath = chainLinks[chainLinks.length - 1].callPath;
  if (outermostPath.parent.value.type !== 'AwaitExpression' && makeAwaitable(j, outermostPath)) {
    outermostPath.parentPath.value[outermostPath.name] = j.awaitExpression(outermostPath.value);
  }

  return sendRequestCall;
};

export default sendRequestTransformer;
