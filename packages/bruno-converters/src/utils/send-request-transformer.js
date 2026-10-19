import { getStaticPropertyName, isFunctionExpression } from './ast-utils';
import { PROMISE_CHAIN_METHODS, getPromiseChainLinks, resolvesToBinding } from './semantic';

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
 * The declarator an identifier reference resolves to, or null when it cannot be attributed to
 * exactly one.
 *
 * ast-types models function scope rather than block scope, so two declarations of one name in
 * nested blocks of the same function are indistinguishable — the same reason `collectBindings`
 * drops a name declared more than once in a scope.
 *
 * @param {Object} j - jscodeshift API
 * @param {Object} root - Collection of the enclosing Program
 * @param {Object} referencePath - Path of the reference to resolve
 * @param {string} name - Name being referenced
 * @returns {Object|null} Path of the declarator
 */
const findBindingDeclarator = (j, root, referencePath, name) => {
  const scope = referencePath.scope && referencePath.scope.lookup(name);
  if (!scope) return null;

  const declarators = root
    .find(j.VariableDeclarator, { id: { name } })
    .paths()
    .filter((declaratorPath) => declaratorPath.scope.node === scope.node);

  return declarators.length === 1 ? declarators[0] : null;
};

/**
 * Transform the request config a reference resolves to, following a chain of aliases.
 *
 * Only the declaration the reference actually resolves to is transformed: an unrelated object
 * sharing the name is left alone, and a shadowed outer declaration is not reached.
 *
 * @param {Object} j - jscodeshift API
 * @param {Object} root - Collection of the enclosing Program
 * @param {Object} referencePath - Path of the reference to the config
 * @param {string} name - Name being referenced
 * @param {Set} visited - Declarators already followed, to stop a circular chain
 * @returns {Object|null} - Transformed object expression or null if not found
 */
const transformReferencedConfig = (j, root, referencePath, name, visited = new Set()) => {
  const declaratorPath = findBindingDeclarator(j, root, referencePath, name);
  if (!declaratorPath || visited.has(declaratorPath.value)) return null;
  visited.add(declaratorPath.value);

  const init = declaratorPath.value.init;
  if (!init) return null;

  if (init.type === 'ObjectExpression') {
    transformHeaders(j, init);
    transformBody(j, init);

    return init;
  }

  // the variable references another variable — follow the chain from its own declaration
  if (init.type === 'Identifier') {
    return transformReferencedConfig(j, root, declaratorPath.get('init'), init.name, visited);
  }

  return null;
};

/**
 * Whether the call's result is bound to a name that is later used as a promise.
 *
 * `const p = pm.sendRequest(q); p.then(h)` must not become `const p = await bru.sendRequest(q)`:
 * awaiting hands `p` the resolved response, and the chain hanging off it would then be calling
 * `.then` on a value that has none.
 *
 * @param {Object} j - jscodeshift API
 * @param {Object} callPath - Path of the sendRequest CallExpression
 * @returns {boolean}
 */
const bindsAPromise = (j, callPath) => {
  const declaratorPath = callPath.parent;
  if (!declaratorPath || declaratorPath.value.type !== 'VariableDeclarator') return false;
  if (declaratorPath.value.id.type !== 'Identifier') return false;

  const binding = { name: declaratorPath.value.id.name, scopeNode: declaratorPath.scope.node };

  return j(callPath)
    .closest(j.Program)
    .find(j.MemberExpression)
    .paths()
    .some((memberPath) => {
      if (!PROMISE_CHAIN_METHODS.has(getStaticPropertyName(memberPath.value))) return false;

      const object = memberPath.value.object;
      return object.type === 'Identifier'
        && object.name === binding.name
        && resolvesToBinding(memberPath.get('object'), binding);
    });
};

const sendRequestTransformer = (path, j) => {
  const callPath = path.parent;
  const callExpr = callPath.value;
  if (callExpr.type !== 'CallExpression') return;

  // Clone the argument object for modification
  const args = [...callExpr.arguments];
  if (!args.length) return;

  const requestOptions = args[0];

  // transform the request config options
  if (requestOptions.type === 'ObjectExpression') {
    // Transform headers
    transformHeaders(j, requestOptions);
    // Transform body
    transformBody(j, requestOptions);
  } else if (requestOptions.type === 'Identifier') {
    // Resolve from the argument itself, so the reference's own scope decides the declaration
    const root = j(path).closest(j.Program);

    transformReferencedConfig(j, root, callPath.get('arguments', 0), requestOptions.name);
  }

  const callbackArg = args[1];

  // `bru.sendRequest` callbacks may await, so a translated callback is always async. Its
  // parameters were typed by `applySemanticTypes`, before any of these names changed.
  if (isFunctionExpression(callbackArg)) callbackArg.async = true;

  const sendRequestCall = j.callExpression(
    j.identifier('bru.sendRequest'),
    callbackArg ? [requestOptions, callbackArg] : [requestOptions]
  );

  const wasParentAwaited = callPath.parent.value.type === 'AwaitExpression';

  // Already inside an `await`, so no promise chain can legitimately follow: `(await bru.sendRequest(req)).then(h)`
  if (wasParentAwaited) return sendRequestCall;

  const chainLinks = getPromiseChainLinks(callPath);

  if (!chainLinks.length) {
    const shouldAwait = !bindsAPromise(j, callPath) && ensureAsyncContext(j, callPath);

    return shouldAwait ? j.awaitExpression(sendRequestCall) : sendRequestCall;
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
