// Static catalog of curated chai plugins.
// Each entry seeds a `scripts.plugins.chai` row in bruno.json.
//
// compat values:
//   'pure-js'   — pure-JS plugin body, no require(). Works in both Safe mode and Developer mode.
//   'node-only' — uses require(), needs Developer mode enabled.
//   'bundled'   — reserved for future (chai-subset / chai-as-promised / chai-json-schema)
//                 when pre-bundled into the Safe-mode sandbox.

export const CATALOG = [
  {
    name: 'chai-subset',
    description: 'Adds .containSubset() for partial-object matching.',
    compat: 'node-only',
    docsUrl: 'https://www.chaijs.com/plugins/chai-subset/',
    snippet: `// Asserts a partial object match. Works only in Developer mode.
chai.use(require('chai-subset'));
`
  },
  {
    name: 'chai-as-promised',
    description: 'Adds .eventually, .rejectedWith, etc. for promise assertions.',
    compat: 'node-only',
    docsUrl: 'https://www.chaijs.com/plugins/chai-as-promised/',
    snippet: `// Promise-aware assertions. Works only in Developer mode.
chai.use(require('chai-as-promised'));
`
  },
  {
    name: 'chai-json-schema',
    description: 'Adds .jsonSchema for validating bodies against JSON Schema.',
    compat: 'node-only',
    docsUrl: 'https://www.chaijs.com/plugins/chai-json-schema/',
    snippet: `// JSON Schema (Draft-04) validation. Works only in Developer mode.
chai.use(require('chai-json-schema'));
`
  },
  {
    name: 'chai-http',
    description: 'HTTP integration helpers (.request, .have.status, etc.).',
    compat: 'node-only',
    docsUrl: 'https://www.chaijs.com/plugins/chai-http/',
    snippet: `// HTTP request helpers. Works only in Developer mode.
chai.use(require('chai-http'));
`
  },
  {
    name: 'chai-like',
    description: 'Adds .like() for deep partial matching without an npm install.',
    compat: 'pure-js',
    docsUrl: 'https://www.chaijs.com/plugins/chai-like/',
    snippet: `// Pure-JS partial match. Works in Safe mode and Developer mode.
chai.use(function (chai, utils) {
  function isPlainObject(v) {
    return v !== null && typeof v === 'object' && !Array.isArray(v);
  }
  function matches(actual, expected) {
    if (Array.isArray(expected)) {
      if (!Array.isArray(actual) || actual.length < expected.length) return false;
      return expected.every((e, i) => matches(actual[i], e));
    }
    if (isPlainObject(expected)) {
      if (!isPlainObject(actual)) return false;
      return Object.keys(expected).every((k) => matches(actual[k], expected[k]));
    }
    return actual === expected;
  }
  chai.Assertion.addMethod('like', function (expected) {
    this.assert(
      matches(this._obj, expected),
      'expected #{act} to be like #{exp}',
      'expected #{act} not to be like #{exp}',
      expected,
      this._obj,
      true
    );
  });
});
`
  },
  {
    name: 'chai-datetime',
    description: 'Date comparison assertions (.beforeDate, .afterDate, etc.).',
    compat: 'node-only',
    docsUrl: 'https://www.chaijs.com/plugins/chai-datetime/',
    snippet: `// Date assertions. Works only in Developer mode.
chai.use(require('chai-datetime'));
`
  }
];

export const COMPAT_META = {
  'pure-js': {
    label: 'Pure JS · Both modes',
    status: 'info',
    description: 'Works in Safe mode (default) and Developer mode.'
  },
  'node-only': {
    label: 'Developer mode only',
    status: 'warning',
    description: 'Requires Developer mode (Preferences → Beta → JavaScript sandbox).'
  },
  'bundled': {
    label: 'Bundled · Works everywhere',
    status: 'success',
    description: 'Pre-bundled into Bruno; no setup required.'
  }
};
