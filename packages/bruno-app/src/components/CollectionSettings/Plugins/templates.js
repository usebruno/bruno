// Code templates for building a custom chai plugin from scratch.
// Each template is pure-JS — works in both QuickJS and Node VM.

export const TEMPLATES = [
  {
    name: 'Custom matcher',
    description: 'Add a method that asserts a custom condition.',
    snippet: `chai.use(function (chai, utils) {
  chai.Assertion.addMethod('beEven', function () {
    const value = this._obj;
    this.assert(
      typeof value === 'number' && value % 2 === 0,
      'expected #{this} to be an even number',
      'expected #{this} not to be an even number'
    );
  });
});
`
  },
  {
    name: 'Custom property',
    description: 'Add a chainable property that asserts without parentheses.',
    snippet: `chai.use(function (chai, utils) {
  chai.Assertion.addProperty('positive', function () {
    const value = this._obj;
    this.assert(
      typeof value === 'number' && value > 0,
      'expected #{this} to be positive',
      'expected #{this} not to be positive'
    );
  });
});

// Usage in a test:
//   expect(42).to.be.positive;
`
  },
  {
    name: 'Async assertion',
    description: 'Promise-based matcher that awaits a value resolution.',
    snippet: `chai.use(function (chai, utils) {
  chai.Assertion.addMethod('eventuallyEqual', async function (expected) {
    const resolved = await Promise.resolve(this._obj);
    new chai.Assertion(resolved).to.equal(expected);
  });
});

// Usage in a test:
//   await expect(fetchUser()).to.eventuallyEqual({ id: 1 });
`
  },
  {
    name: 'Deep partial match',
    description: 'Subset-match without depending on chai-subset.',
    snippet: `chai.use(function (chai, utils) {
  function matchesSubset(actual, expected) {
    if (expected === null || typeof expected !== 'object') return actual === expected;
    if (Array.isArray(expected)) {
      if (!Array.isArray(actual)) return false;
      return expected.every((e, i) => matchesSubset(actual[i], e));
    }
    return Object.keys(expected).every((k) => matchesSubset(actual?.[k], expected[k]));
  }
  chai.Assertion.addMethod('partialMatch', function (expected) {
    this.assert(
      matchesSubset(this._obj, expected),
      'expected #{act} to contain subset #{exp}',
      'expected #{act} not to contain subset #{exp}',
      expected,
      this._obj
    );
  });
});

// Usage in a test:
//   expect(response).to.partialMatch({ status: 200, body: { ok: true } });
`
  }
];
