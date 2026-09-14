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
 * Whether an argument node is an explicit absent value, as in `.then(null, onError)`.
 * @param {Object} node - Argument node
 * @returns {boolean}
 */
const isNullish = (node) =>
  (node.type === 'Literal' && node.value === null)
  || (node.type === 'Identifier' && node.name === 'undefined');

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
    if (chainedCallPath.value.callee !== memberPath.value) break;

    links.push({ callPath: chainedCallPath, methodName });
    currentPath = chainedCallPath;
  }

  return links;
};

/**
 * Whether a function is a `.then`/`.catch`/`.finally` handler argument
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
 * Bruno runs scripts in an async closure, so top-level `await` is always legal. Making a
 * function async is safe only for promise-chain handlers — they already run asynchronously;
 * for any other function it would change caller semantics.
 * @param {Object} j - jscodeshift API
 * @param {Object} path - Path the await would be emitted at
 * @returns {boolean}
 */
const ensureAsyncContext = (j, path) => {
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
 * Rewrite Postman response access on a handler's response parameter to its Bruno
 * equivalent (res.json() -> res.data, res.code -> res.status, ...). References
 * that resolve to a different binding — a nested function re-declaring the name —
 * are left alone.
 * @param {Object} j - jscodeshift API
 * @param {Object} handlerPath - Path of the `.then` fulfilled handler argument; the
 *   caller guarantees it is a function expression with an Identifier first param.
 */
const rewriteThenHandlerResponseAccess = (j, handlerPath) => {
  const handler = handlerPath.value;
  const responseVarName = handler.params[0].name;

  j(handlerPath).find(j.MemberExpression, {
    object: {
      type: 'Identifier',
      name: responseVarName
    }
  }).forEach((memberPath) => {
    const propertyName = getStaticPropertyName(memberPath.value);
    if (!propertyName) return;
    const bruProperty = responsePropertyMap[propertyName];
    if (typeof bruProperty !== 'string') return;

    // skip references shadowed by a nested re-declaration of the name
    if (!resolvesToHandlerParam(memberPath, responseVarName, handler)) return;

    const replacement = j.memberExpression(j.identifier(responseVarName), j.identifier(bruProperty));

    const parent = memberPath.parent;
    const isMethodCall = parent.value.type === 'CallExpression' && parent.value.callee === memberPath.value;

    // `json()`/`text()` are methods on the Postman response but plain properties on Bruno's,
    // so the call has to lose its parentheses: `res.json()` -> `res.data`
    if (isMethodCall) {
      j(parent).replaceWith(replacement);
    } else {
      j(memberPath).replaceWith(replacement);
    }
  });
};

/**
* The return statements belonging to the handler itself.
* @example
 * sendRequest(req).then((res) => {
 *   const extract = () => {
 *     return res.data;      // nested function's return — not the handler's
 *   };
 *   console.log(extract());
 *   return res;             // the handler's actual return
 * });
 * @param {Object} j - jscodeshift API
 * @param {Object} handlerPath - Path of the `.then` fulfilled handler argument
 * @returns {Object[]} Paths of the handler's own return statements
 */
const findOwnReturns = (j, handlerPath) =>
  j(handlerPath)
    .find(j.ReturnStatement)
    .paths()
    .filter((returnPath) => j(returnPath).closest(j.Function).get().value === handlerPath.value);

/**
 * Whether the handler forwards its response parameter untouched, so response-shape
 * rewriting can safely continue on the next `.then` in the chain.
 * @param {Object} j - jscodeshift API
 * @param {Object} handlerPath - Path of the `.then` fulfilled handler argument
 * @returns {boolean}
 */
const returnsParamUnchanged = (j, handlerPath) => {
  const handler = handlerPath.value;
  const paramName = handler.params[0].name;
  const body = handler.body;

  // a concise arrow body is the returned expression itself, so it only forwards the
  // response when that expression is the parameter — `res => res` yes, `res => res.data` no
  if (body.type !== 'BlockStatement') {
    return body.type === 'Identifier' && body.name === paramName;
  }

  // Every path must end in a return: a body that can fall through forwards an implicit undefined,
  // and a handler with no returns at all would pass the `every` check below vacuously.
  const lastStatement = body.body[body.body.length - 1];
  if (!lastStatement || lastStatement.type !== 'ReturnStatement') return false;

  const ownReturns = findOwnReturns(j, handlerPath);

  return ownReturns.every((returnPath) => {
    const argument = returnPath.value.argument;
    const returnsParamIdentifier = Boolean(argument) && argument.type === 'Identifier' && argument.name === paramName;
    return returnsParamIdentifier && resolvesToHandlerParam(returnPath, paramName, handler);
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

  const isParamReassigned = (path, target) =>
    target.type === 'Identifier'
    && target.name === paramName
    && resolvesToHandlerParam(path, paramName, handler);

  // assignment expression example : `res = ...`, `res += ...`, `res ||= ...`
  const isParamReassignedByAssignmentExpression = j(handlerPath)
    .find(j.AssignmentExpression)
    .paths()
    .some((path) => isParamReassigned(path, path.value.left));

  return isParamReassignedByAssignmentExpression;
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

    // Add async keyword to the callback function
    if (transformedCallback && (transformedCallback.type === 'FunctionExpression' || transformedCallback.type === 'ArrowFunctionExpression')) {
      transformedCallback.async = true;
    }
  }

  const sendRequestCall = j.callExpression(
    j.identifier('bru.sendRequest'),
    transformedCallback ? [requestOptions, transformedCallback] : [requestOptions]
  );

  const wasParentAwaited = callPath.parent.value.type === 'AwaitExpression';

  // Already inside an `await`, so no promise chain can legitimately follow: `(await bru.sendRequest(req)).then(h)`
  if (wasParentAwaited) return sendRequestCall;

  const chainLinks = getPromiseChainLinks(callPath);

  if (!chainLinks.length) {
    return ensureAsyncContext(j, callPath) ? j.awaitExpression(sendRequestCall) : sendRequestCall;
  }

  for (const link of chainLinks) {
    const [handler] = link.callPath.value.arguments;

    // a `.catch` handler substitutes its own return value for the rest of the chain, so links
    // past it no longer receive the response we mapped.
    if (link.methodName === 'catch') break;

    const hasFulfilledHandler = link.methodName === 'then' && Boolean(handler) && !isNullish(handler);

    if (!hasFulfilledHandler) continue;

    if (handler.type !== 'FunctionExpression' && handler.type !== 'ArrowFunctionExpression') break;
    // rewriting response access requires a plain identifier param — destructuring can't be tracked
    if (handler.params.length === 0 || handler.params[0].type !== 'Identifier') break;

    const handlerPath = link.callPath.get('arguments', 0);

    const returnsResponse = returnsParamUnchanged(j, handlerPath);
    const reassignsResponse = isResponseParamReassigned(j, handlerPath);

    rewriteThenHandlerResponseAccess(j, handlerPath);

    if (!returnsResponse) break;
    if (reassignsResponse) break;
  }

  const outermostPath = chainLinks[chainLinks.length - 1].callPath;
  const isAlreadyAwaited = outermostPath.parent.value.type === 'AwaitExpression';
  const shouldAwaitChain = !isAlreadyAwaited && ensureAsyncContext(j, outermostPath);

  if (shouldAwaitChain) {
    outermostPath.parentPath.value[outermostPath.name] = j.awaitExpression(outermostPath.value);
  }

  return sendRequestCall;
};

export default sendRequestTransformer;
