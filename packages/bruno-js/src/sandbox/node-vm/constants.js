/**
 * Constants for the Node.js VM sandbox.
 *
 * ECMAScript built-ins (Object, Array, Function, etc.)
 * are NOT passed from the host. The VM provides its own versions, ensuring
 * consistent prototype chains for libraries that use introspection.
 *
 * Handled separately in index.js:
 * - global/globalThis: Points to isolated context (not host)
 * - require: createCustomRequire() (custom module loader)
 */

/**
 * Safe globals to pass from host to VM context.
 *
 * ECMAScript built-ins (Object, Array, Function, String, Number,
 * Boolean, Symbol, Date, RegExp, Map, Set, Promise, JSON, Math,
 * parseInt, etc.) are intentionally NOT included here.
 *
 * The VM context provides its own versions of these, which ensures consistent
 * prototype chains. Passing host versions causes prototype mismatches.
 *
 * Only Node.js-specific and Web APIs that the VM doesn't provide are listed.
 */
const safeGlobals = [
  'process',

  // Node.js timers (not part of ECMAScript)
  'setTimeout',
  'setInterval',
  'clearTimeout',
  'clearInterval',
  'setImmediate',
  'clearImmediate',
  'queueMicrotask',

  // Node.js globals
  'Buffer',

  // Error types - needed for instanceof checks with errors from host APIs/modules
  'Error',
  'TypeError',
  'ReferenceError',
  'SyntaxError',
  'RangeError',
  'URIError',
  'EvalError',
  'AggregateError',

  // URL APIs (WHATWG - not ECMAScript)
  'URL',
  'URLSearchParams',

  // Encoding APIs
  'TextEncoder',
  'TextDecoder',
  'atob',
  'btoa',

  // Fetch API (Node 18+)
  'fetch',
  'Request',
  'Response',
  'Headers',
  'FormData',
  'AbortController',
  'AbortSignal',
  'Blob',

  // Streams API
  'ReadableStream',
  'WritableStream',
  'TransformStream',

  // Internationalization (needs host's locale data)
  'Intl',

  // Web Crypto API
  'crypto',

  // WebAssembly
  'WebAssembly',

  // Performance API
  'performance',

  // Events API
  'Event',
  'EventTarget',
  'CustomEvent',

  // Message passing
  'MessageChannel',
  'MessagePort'
];

module.exports = {
  safeGlobals
};
