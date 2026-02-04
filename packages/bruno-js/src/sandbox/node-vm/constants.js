/**
 * Constants for the Node.js VM sandbox.
 *
 * ECMAScript built-ins (Object, Array, Function, etc.)
 * are NOT passed from the host. The VM provides its own versions, ensuring
 * consistent prototype chains for libraries that use introspection.
 *
 * Handled separately in index.js:
 * - global/globalThis: Points to isolated context (not host)
 * - process: createSanitizedProcess() (blocks exit, kill, etc.)
 * - require: createCustomRequire() (custom module loader)
 */

/**
 * Creates a sanitized process object with safe properties only.
 * Blocks methods like exit(), kill(), binding(), dlopen().
 *
 * Allowed:
 * - process.env: Environment variables
 * - process.platform, process.arch, process.version: System info
 * - process.nextTick, process.hrtime: Timing utilities
 * - process.cwd(): Current working directory (read-only info)
 * - process.memoryUsage(): Memory stats
 *
 * Blocked:
 * - process.exit(): Can crash the application
 * - process.kill(): Can kill processes
 * - process.binding(): Access to native bindings
 * - process.dlopen(): Load native modules
 * - process.chdir(): Change working directory
 * - process._* (internal properties)
 */
function createSanitizedProcess() {
  const safeProcessProperties = [
    // Environment
    'env',

    // System info (read-only)
    'platform',
    'arch',
    'version',
    'versions',
    'release',

    // Timing utilities
    'nextTick',
    'hrtime',

    // Safe methods
    'cwd',
    'memoryUsage',
    'uptime',
    'cpuUsage',

    // Event emitter methods (needed by some libraries)
    'on',
    'once',
    'off',
    'emit',
    'addListener',
    'removeListener',
    'removeAllListeners',
    'listeners',
    'listenerCount',

    // Stdio (read-only access)
    'stdout',
    'stderr',
    'stdin'
  ];

  const sanitizedProcess = {};

  for (const prop of safeProcessProperties) {
    if (prop in process) {
      const value = process[prop];
      if (typeof value === 'function') {
        // Bind functions to the real process object
        sanitizedProcess[prop] = value.bind(process);
      } else {
        sanitizedProcess[prop] = value;
      }
    }
  }

  return sanitizedProcess;
}

/**
 * Safe globals to pass from host to VM context.
 *
 * ECMAScript built-ins (Object, Array, Function, String, Number,
 * Boolean, Symbol, Date, RegExp, Map, Set, Promise, Error types, JSON, Math,
 * parseInt, etc.) are intentionally NOT included here.
 *
 * The VM context provides its own versions of these, which ensures consistent
 * prototype chains. Passing host versions causes prototype mismatches.
 *
 * Only Node.js-specific and Web APIs that the VM doesn't provide are listed.
 */
const safeGlobals = [
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
  'MessagePort',

  // Structured cloning (Node 17+)
  'structuredClone'
];

module.exports = {
  safeGlobals,
  createSanitizedProcess
};
