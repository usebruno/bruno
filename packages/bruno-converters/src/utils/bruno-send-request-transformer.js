const j = require('jscodeshift');
import { isFunctionExpression } from './ast-utils';
import {
  collectChainBindings,
  collectHandlerBindings,
  getPromiseChainLinks,
  rewriteMembers,
  BRUNO_REGISTRY
} from './semantic';

// Which parameter of each kind of handler receives the response, and as what type
const { callback: CALLBACK_SLOT_TYPES, then: THEN_SLOT_TYPES } = BRUNO_REGISTRY.params['bru.sendRequest'];
const CALLBACK_RESPONSE_INDEX = CALLBACK_SLOT_TYPES.findIndex(Boolean);

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
 * @param {Object} callbackPath - Path of the callback argument
 * @returns {Object|null} - Transformed callback function, or null if not a function
 */
const transformCallback = (callbackPath) => {
  const callback = callbackPath.value;
  if (!isFunctionExpression(callback)) return null;

  const params = callback.params;
  const responseParam = params[CALLBACK_RESPONSE_INDEX];

  const bindings = collectHandlerBindings(j, callbackPath, CALLBACK_SLOT_TYPES, BRUNO_REGISTRY);
  rewriteMembers(j, j(callbackPath), bindings, BRUNO_REGISTRY);

  // read after the rewrite: a concise body is replaced outright, so a reference taken before it
  // would still point at the untranslated expression
  const callbackBody = callback.body;

  // Create the callback - Postman uses regular functions
  const bodyStatements = callbackBody.type === 'BlockStatement' ? callbackBody.body : [j.returnStatement(callbackBody)];

  /**
   * Postman hands the callback `(error, response)`, so a missing parameter is filled in —
   * but the ones the script already declares are carried over as they are. Rebuilding them
   * as identifiers would discard a destructuring pattern and leave its bindings undeclared.
   */
  const outputParams = [
    params[0] || j.identifier('error'),
    responseParam || j.identifier('response')
  ];

  const functionExpr = j.functionExpression(
    null,
    outputParams,
    j.blockStatement(bodyStatements)
  );

  functionExpr.async = callback.async;

  return functionExpr;
};

/**
 * The declarator an identifier reference resolves to, or null when it cannot be attributed to
 * exactly one.
 *
 * ast-types models function scope rather than block scope, so two declarations of one name in
 * nested blocks of the same function are indistinguishable — the same reason `collectBindings`
 * drops a name declared more than once in a scope.
 *
 * @param {Object} root - Collection of the enclosing Program
 * @param {Object} referencePath - Path of the reference to resolve
 * @param {string} name - Name being referenced
 * @returns {Object|null} Path of the declarator
 */
const findBindingDeclarator = (root, referencePath, name) => {
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
 * @param {Object} root - Collection of the enclosing Program
 * @param {Object} referencePath - Path of the reference to the config
 * @param {string} name - Name being referenced
 * @param {Set} visited - Declarators already followed, to stop a circular chain
 * @returns {Object|null} - Transformed object expression or null if not found
 */
const transformReferencedConfig = (root, referencePath, name, visited = new Set()) => {
  const declaratorPath = findBindingDeclarator(root, referencePath, name);
  if (!declaratorPath || visited.has(declaratorPath.value)) return null;
  visited.add(declaratorPath.value);

  const init = declaratorPath.value.init;
  if (!init) return null;

  if (init.type === 'ObjectExpression') {
    // Content-Type is read before the headers are renamed, since the rename is to `header`
    const contentType = getContentType(init);
    transformHeaders(init);
    transformBody(init, contentType);

    return init;
  }

  // the variable references another variable — follow the chain from its own declaration
  if (init.type === 'Identifier') {
    return transformReferencedConfig(root, declaratorPath.get('init'), init.name, visited);
  }

  return null;
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
  const callbackPath = path.get('arguments', 1);

  // Transform the request config options
  if (requestOptions.type === 'ObjectExpression') {
    // Get Content-Type BEFORE transforming headers (since we rename headers to header)
    const contentType = getContentType(requestOptions);
    // Transform headers
    transformHeaders(requestOptions);
    // Transform body
    transformBody(requestOptions, contentType);
  } else if (requestOptions.type === 'Identifier') {
    // Resolve from the argument itself, so the reference's own scope decides the declaration
    const root = j(path).closest(j.Program);

    transformReferencedConfig(root, path.get('arguments', 0), requestOptions.name);
  }

  // Transform callback if present
  let transformedArgs = [requestOptions];
  if (callback) {
    const transformedCallback = transformCallback(callbackPath);
    if (transformedCallback) {
      transformedArgs.push(transformedCallback);
    } else {
      transformedArgs.push(callback);
    }
  }

  /**
   * A `.then` handler receives the same response the callback form does. Typing it here is what
   * keeps the flat map from rewriting a handler's own parameter as though it were the global
   * response — `res.status` inside a handler is the parameter, not `pm.response`.
   */
  const chainLinks = getPromiseChainLinks(path);
  if (chainLinks.length) {
    const chainBindings = collectChainBindings(j, chainLinks, THEN_SLOT_TYPES, BRUNO_REGISTRY);

    // the outermost link contains every inner link and handler, so one pass covers the chain
    if (chainBindings.length) {
      rewriteMembers(j, j(chainLinks[chainLinks.length - 1].callPath), chainBindings, BRUNO_REGISTRY);
    }
  }

  // Create pm.sendRequest call
  return j.callExpression(buildPmSendRequest(), transformedArgs);
};

export default bruSendRequestTransformer;
