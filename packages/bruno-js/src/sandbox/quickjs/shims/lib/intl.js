const { marshallToVm } = require('../../utils');

/**
 * Intl shim for the QuickJS sandbox.
 *
 * QuickJS ships without ICU, so `Intl` is undefined and the `toLocale*` methods
 * ignore their locale / timeZone arguments. This shim defines `Intl` inside the
 * sandbox and forwards every call to the host's real Intl (Node ships ICU).
 * Only primitives and plain objects cross the boundary: dates travel as epoch ms.
 *
 * Constructing a host formatter is the expensive part, so instances are cached
 * per (kind, locales, options) in a small LRU shared across contexts.
 */

const FORMATTER_CACHE_MAX = 64;
const formatterCache = new Map();

const SUPPORTED_KINDS = [
  'DateTimeFormat',
  'NumberFormat',
  'Collator',
  'PluralRules',
  'RelativeTimeFormat',
  'ListFormat',
  'DisplayNames'
];

// Methods whose arguments are dates (received as epoch ms, converted back to Date).
const DATE_ARG_METHODS = new Set(['format', 'formatToParts', 'formatRange', 'formatRangeToParts']);

const getCacheKey = (kind, locales, options) => `${kind}|${JSON.stringify({ l: locales, o: options })}`;

const getFormatter = (kind, locales, options) => {
  const key = getCacheKey(kind, locales, options);
  const cached = formatterCache.get(key);
  if (cached) {
    // Refresh recency.
    formatterCache.delete(key);
    formatterCache.set(key, cached);
    return cached;
  }
  const formatter = new Intl[kind](locales, options);
  formatterCache.set(key, formatter);
  if (formatterCache.size > FORMATTER_CACHE_MAX) {
    formatterCache.delete(formatterCache.keys().next().value);
  }
  return formatter;
};

const toDateArg = (value) => (value === undefined ? undefined : new Date(value));

const callFormatter = (kind, locales, options, method, args) => {
  if (!SUPPORTED_KINDS.includes(kind)) {
    throw new TypeError(`Intl.${kind} is not supported in the sandbox`);
  }
  const formatter = getFormatter(kind, locales, options);
  if (typeof formatter[method] !== 'function') {
    throw new TypeError(`Intl.${kind}.prototype.${method} is not a function`);
  }
  const nativeArgs = kind === 'DateTimeFormat' && DATE_ARG_METHODS.has(method) ? args.map(toDateArg) : args;
  return formatter[method](...nativeArgs);
};

const callStatic = (kind, method, args) => {
  if (kind === 'Intl') {
    if (method !== 'getCanonicalLocales' && method !== 'supportedValuesOf') {
      throw new TypeError(`Intl.${method} is not a function`);
    }
    return Intl[method](...args);
  }
  if (!SUPPORTED_KINDS.includes(kind) || method !== 'supportedLocalesOf') {
    throw new TypeError(`Intl.${kind}.${method} is not a function`);
  }
  return Intl[kind].supportedLocalesOf(...args);
};

const callToLocale = (method, value, locales, options, extra) => {
  switch (method) {
    case 'toLocaleString':
    case 'toLocaleDateString':
    case 'toLocaleTimeString':
      return new Date(value)[method](locales, options);
    case 'numberToLocaleString':
      return Number(value).toLocaleString(locales, options);
    case 'localeCompare':
      return String(value).localeCompare(extra, locales, options);
    default:
      throw new TypeError(`Unsupported locale method ${method}`);
  }
};

// Runs inside the sandbox. Defines `Intl` and the locale-aware prototype methods,
// forwarding to the host functions captured at the top. Mirrors spec quirks that
// scripts rely on: constructors work without `new`, `format`/`compare` are bound
// getters, and instances expose no enumerable own properties.
const PRELUDE = `
(function () {
  const call = globalThis.__bruno__intl__call;
  const callStatic = globalThis.__bruno__intl__static;
  const toLocale = globalThis.__bruno__intl__toLocale;
  delete globalThis.__bruno__intl__call;
  delete globalThis.__bruno__intl__static;
  delete globalThis.__bruno__intl__toLocale;

  const state = new WeakMap();
  const toTime = (d) => (d === undefined ? undefined : d instanceof Date ? d.getTime() : Number(d));
  const identity = (args) => args;
  const dateArgs = (args) => args.map(toTime);

  const KINDS = {
    DateTimeFormat: { methods: ['format', 'formatToParts', 'formatRange', 'formatRangeToParts'], mapArgs: dateArgs, bound: 'format' },
    NumberFormat: { methods: ['format', 'formatToParts', 'formatRange', 'formatRangeToParts'], mapArgs: identity, bound: 'format' },
    Collator: { methods: ['compare'], mapArgs: identity, bound: 'compare' },
    PluralRules: { methods: ['select', 'selectRange'], mapArgs: identity },
    RelativeTimeFormat: { methods: ['format', 'formatToParts'], mapArgs: identity },
    ListFormat: { methods: ['format', 'formatToParts'], mapArgs: identity },
    DisplayNames: { methods: ['of'], mapArgs: identity }
  };

  const Intl = {};
  Object.defineProperty(Intl, Symbol.toStringTag, { value: 'Intl' });

  for (const kind of Object.keys(KINDS)) {
    const { methods, mapArgs, bound } = KINDS[kind];
    const Ctor = function (locales, options) {
      if (!(this instanceof Ctor)) {
        return new Ctor(locales, options);
      }
      // Validate eagerly so bad locales / options throw at construction like the host does.
      call(kind, locales, options, 'resolvedOptions');
      state.set(this, { locales, options, boundFns: {} });
    };
    Object.defineProperty(Ctor, 'name', { value: kind });
    Ctor.supportedLocalesOf = (locales, options) => callStatic(kind, 'supportedLocalesOf', locales, options);

    const invoke = (self, method, args) => {
      const s = state.get(self);
      if (!s) {
        throw new TypeError('Method Intl.' + kind + '.prototype.' + method + ' called on incompatible receiver');
      }
      return call(kind, s.locales, s.options, method, ...mapArgs(args));
    };

    Ctor.prototype.resolvedOptions = function () {
      return invoke(this, 'resolvedOptions', []);
    };
    for (const method of methods) {
      if (method === bound) {
        Object.defineProperty(Ctor.prototype, method, {
          configurable: true,
          get() {
            const s = state.get(this);
            if (!s) {
              throw new TypeError('Method Intl.' + kind + '.prototype.' + method + ' called on incompatible receiver');
            }
            if (!s.boundFns[method]) {
              s.boundFns[method] = (...args) => invoke(this, method, args);
            }
            return s.boundFns[method];
          }
        });
      } else {
        Ctor.prototype[method] = function (...args) {
          return invoke(this, method, args);
        };
      }
    }
    Object.defineProperty(Ctor.prototype, Symbol.toStringTag, { value: 'Intl.' + kind });
    Intl[kind] = Ctor;
  }

  Intl.getCanonicalLocales = (locales) => callStatic('Intl', 'getCanonicalLocales', locales);
  Intl.supportedValuesOf = (key) => callStatic('Intl', 'supportedValuesOf', key);

  Object.defineProperty(globalThis, 'Intl', { value: Intl, writable: true, configurable: true });

  const dateGetTime = Date.prototype.getTime;
  for (const method of ['toLocaleString', 'toLocaleDateString', 'toLocaleTimeString']) {
    Date.prototype[method] = function (locales, options) {
      return toLocale(method, dateGetTime.call(this), locales, options);
    };
  }
  const numberValueOf = Number.prototype.valueOf;
  Number.prototype.toLocaleString = function (locales, options) {
    return toLocale('numberToLocaleString', numberValueOf.call(this), locales, options);
  };
  const stringValueOf = String.prototype.valueOf;
  String.prototype.localeCompare = function (that, locales, options) {
    return toLocale('localeCompare', stringValueOf.call(this), locales, options, String(that));
  };
})();
`;

const throwVmError = (vm, error) => {
  const vmError = vm.newError(error?.message ?? String(error));
  vm.setProp(vmError, 'name', vm.newString(error?.name ?? 'Error'));
  throw vmError;
};

const registerHostFunction = (vm, name, impl) => {
  const handle = vm.newFunction(name, function (...handles) {
    try {
      return marshallToVm(impl(...handles.map(vm.dump)), vm);
    } catch (error) {
      throwVmError(vm, error);
    }
  });
  vm.setProp(vm.global, `__bruno__intl__${name}`, handle);
  handle.dispose();
};

const addIntlShimToContext = (vm) => {
  registerHostFunction(vm, 'call', (kind, locales, options, method, ...args) =>
    callFormatter(kind, locales, options, method, args)
  );
  registerHostFunction(vm, 'static', (kind, method, ...args) => callStatic(kind, method, args));
  registerHostFunction(vm, 'toLocale', callToLocale);

  // A managed context's evalCode auto-disposes and throws on error; a raw
  // context returns the result handles. Support both.
  const result = vm.evalCode(PRELUDE);
  if (result?.error) {
    const error = vm.dump(result.error);
    result.error.dispose();
    throw new Error(`Failed to install Intl shim: ${error?.message ?? error}`);
  }
  result?.value?.dispose();
};

// Cheap source check so the template-interpolation path (run on every `{{ }}`)
// only pays for the shim when an expression can actually use it.
const INTL_USAGE_PATTERN = /\bIntl\b|toLocale|localeCompare/;
const scriptUsesIntl = (script) => typeof script === 'string' && INTL_USAGE_PATTERN.test(script);

module.exports = addIntlShimToContext;
module.exports.scriptUsesIntl = scriptUsesIntl;
