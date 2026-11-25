const { buildRequestContext, evaluateCondition } = require('../src/app/mock-server/mock-rule-matcher');

// Operator contract for mock response rules. Every operator offered in the Rules grid
// (the Assertions operators plus the mock-only isNotNull) and every legacy name still
// found in saved mocks must have at least one passing and one failing case below.
const OPERATORS = [
  'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'notIn', 'contains', 'notContains', 'length',
  'matches', 'notMatches', 'startsWith', 'endsWith', 'between',
  'isEmpty', 'isNotEmpty', 'isNull', 'isNotNull', 'isUndefined', 'isDefined', 'isTruthy', 'isFalsy',
  'isJson', 'isNumber', 'isString', 'isBoolean', 'isArray'
];
const LEGACY_OPERATORS = ['equals', 'not_equals', 'regex'];

// Headers, query params and path params always arrive as strings.
const STRING_DATA = {
  plan: 'premium',
  count: '10',
  neg: '-5',
  empty: '',
  flag: 'true',
  off: 'false',
  nil: 'null',
  json: '{"ok":true}',
  list: '["a","b"]'
};

// JSON bodies keep their types.
const BODY_DATA = {
  plan: 'premium',
  count: 10,
  numStr: '10',
  zero: 0,
  empty: '',
  flag: true,
  off: false,
  nil: null,
  json: { ok: true },
  list: ['a', 'b'],
  emptyList: [],
  emptyObj: {},
  user: { type: 'admin' }
};

const context = buildRequestContext(
  { headers: STRING_DATA, query: { ...STRING_DATA, tags: ['a', 'b'] }, body: BODY_DATA },
  STRING_DATA
);

const check = (target, key, operator, value) => evaluateCondition({ target, key, operator, value }, context);

// [operator, key, value, expected] — run against header, query and path.
const STRING_CASES = [
  ['eq', 'plan', 'premium', true],
  ['eq', 'plan', '"premium"', true],
  ['eq', 'plan', 'free', false],
  ['eq', 'count', '10', true],
  ['eq', 'missing', 'premium', false],
  ['eq', 'missing', '', false],

  ['neq', 'plan', 'free', true],
  ['neq', 'plan', 'premium', false],
  ['neq', 'missing', 'premium', true],

  ['gt', 'count', '2', true],
  ['gt', 'count', '10', false],
  ['gt', 'plan', '1', false],
  ['gt', 'missing', '1', false],
  ['gte', 'count', '10', true],
  ['gte', 'count', '11', false],
  ['lt', 'count', '11', true],
  ['lt', 'neg', '0', true],
  ['lt', 'count', '10', false],
  ['lte', 'count', '10', true],
  ['lte', 'count', '9', false],

  ['in', 'plan', 'free, premium', true],
  ['in', 'plan', '[free, premium]', true],
  ['in', 'plan', '"free", "premium"', true],
  ['in', 'plan', 'free, basic', false],
  ['in', 'missing', 'premium', false],
  ['notIn', 'plan', 'free, basic', true],
  ['notIn', 'plan', 'free, premium', false],
  ['notIn', 'missing', 'premium', true],

  ['contains', 'plan', 'emi', true],
  ['contains', 'plan', 'xyz', false],
  ['contains', 'missing', 'pre', false],
  ['notContains', 'plan', 'xyz', true],
  ['notContains', 'plan', 'emi', false],
  ['notContains', 'missing', 'pre', true],

  ['length', 'plan', '7', true],
  ['length', 'count', '2', true],
  ['length', 'plan', '3', false],
  ['length', 'missing', '0', false],

  ['matches', 'plan', '^pre', true],
  ['matches', 'plan', '/^pre/', true],
  ['matches', 'plan', '^free', false],
  ['matches', 'plan', '(', false],
  ['matches', 'missing', '.*', false],
  ['notMatches', 'plan', '^free', true],
  ['notMatches', 'plan', '^pre', false],
  ['notMatches', 'plan', '(', false],
  ['notMatches', 'missing', '^pre', true],

  ['startsWith', 'plan', 'pre', true],
  ['startsWith', 'plan', 'ium', false],
  ['startsWith', 'missing', 'p', false],
  ['endsWith', 'plan', 'ium', true],
  ['endsWith', 'plan', 'pre', false],
  ['endsWith', 'missing', 'm', false],

  ['between', 'count', '1, 10', true],
  ['between', 'count', '[1, 10]', true],
  ['between', 'count', '11, 20', false],
  ['between', 'plan', '1, 10', false],
  ['between', 'missing', '1, 10', false],

  ['isEmpty', 'empty', '', true],
  ['isEmpty', 'plan', '', false],
  ['isEmpty', 'missing', '', false],
  ['isNotEmpty', 'plan', '', true],
  ['isNotEmpty', 'empty', '', false],
  ['isNotEmpty', 'missing', '', false],

  ['isNull', 'nil', '', true],
  ['isNull', 'plan', '', false],
  ['isNull', 'empty', '', false],
  ['isNull', 'missing', '', false],
  ['isNotNull', 'plan', '', true],
  ['isNotNull', 'empty', '', true],
  ['isNotNull', 'nil', '', false],
  ['isNotNull', 'missing', '', false],

  ['isUndefined', 'missing', '', true],
  ['isUndefined', 'empty', '', false],
  ['isDefined', 'empty', '', true],
  ['isDefined', 'missing', '', false],

  ['isTruthy', 'flag', '', true],
  ['isTruthy', 'count', '', false],
  ['isTruthy', 'plan', '', false],
  ['isFalsy', 'off', '', true],
  ['isFalsy', 'empty', '', false],
  ['isFalsy', 'flag', '', false],

  ['isJson', 'json', '', true],
  ['isJson', 'list', '', true],
  ['isJson', 'plan', '', false],
  ['isJson', 'count', '', false],

  ['isNumber', 'count', '', true],
  ['isNumber', 'neg', '', true],
  ['isNumber', 'plan', '', false],
  ['isNumber', 'empty', '', false],
  ['isString', 'plan', '', true],
  ['isString', 'count', '', true],
  ['isString', 'missing', '', false],
  ['isBoolean', 'flag', '', true],
  ['isBoolean', 'off', '', true],
  ['isBoolean', 'plan', '', false],
  ['isArray', 'list', '', true],
  ['isArray', 'json', '', false],
  ['isArray', 'plan', '', false],

  ['equals', 'plan', 'premium', true],
  ['equals', 'plan', 'free', false],
  ['equals', 'missing', '', true],
  ['not_equals', 'plan', 'free', true],
  ['not_equals', 'plan', 'premium', false],
  ['regex', 'plan', '^pre', true],
  ['regex', 'plan', '^free', false]
];

// [operator, key, value, expected] — run against body with `$.<key>`.
const BODY_CASES = [
  ['eq', 'plan', 'premium', true],
  ['eq', 'count', '10', true],
  ['eq', 'numStr', '10', true],
  ['eq', 'flag', 'true', true],
  ['eq', 'nil', 'null', true],
  ['eq', 'count', '11', false],
  ['eq', 'missing', 'premium', false],

  ['neq', 'count', '11', true],
  ['neq', 'count', '10', false],

  ['gt', 'count', '2', true],
  ['gt', 'numStr', '2', true],
  ['gt', 'count', '10', false],
  ['gt', 'flag', '0', false],
  ['gte', 'count', '10', true],
  ['gte', 'count', '11', false],
  ['lt', 'zero', '1', true],
  ['lt', 'count', '10', false],
  ['lte', 'count', '10', true],
  ['lte', 'count', '9', false],

  ['in', 'count', '5, 10', true],
  ['in', 'flag', 'true, false', true],
  ['in', 'count', '5, 6', false],
  ['notIn', 'count', '5, 6', true],
  ['notIn', 'count', '5, 10', false],

  ['contains', 'list', 'b', true],
  ['contains', 'list', 'c', false],
  ['contains', 'plan', 'emi', true],
  ['notContains', 'list', 'c', true],
  ['notContains', 'list', 'b', false],

  ['length', 'list', '2', true],
  ['length', 'plan', '7', true],
  ['length', 'count', '2', false],
  ['length', 'list', '3', false],

  ['matches', 'plan', '^pre', true],
  ['matches', 'count', '^1', true],
  ['matches', 'plan', '^free', false],
  ['notMatches', 'plan', '^free', true],
  ['notMatches', 'plan', '^pre', false],

  ['startsWith', 'plan', 'pre', true],
  ['startsWith', 'count', '1', true],
  ['startsWith', 'plan', 'ium', false],
  ['endsWith', 'plan', 'ium', true],
  ['endsWith', 'plan', 'pre', false],

  ['between', 'count', '5, 10', true],
  ['between', 'count', '11, 20', false],

  ['isEmpty', 'empty', '', true],
  ['isEmpty', 'emptyList', '', true],
  ['isEmpty', 'emptyObj', '', true],
  ['isEmpty', 'zero', '', false],
  ['isEmpty', 'nil', '', false],
  ['isEmpty', 'missing', '', false],
  ['isNotEmpty', 'list', '', true],
  ['isNotEmpty', 'zero', '', true],
  ['isNotEmpty', 'emptyList', '', false],
  ['isNotEmpty', 'nil', '', false],

  ['isNull', 'nil', '', true],
  ['isNull', 'empty', '', false],
  ['isNull', 'off', '', false],
  ['isNull', 'missing', '', false],
  ['isNotNull', 'empty', '', true],
  ['isNotNull', 'zero', '', true],
  ['isNotNull', 'off', '', true],
  ['isNotNull', 'nil', '', false],
  ['isNotNull', 'missing', '', false],

  ['isUndefined', 'missing', '', true],
  ['isUndefined', 'nil', '', false],
  ['isDefined', 'nil', '', true],
  ['isDefined', 'missing', '', false],

  ['isTruthy', 'flag', '', true],
  ['isTruthy', 'count', '', false],
  ['isTruthy', 'plan', '', false],
  ['isFalsy', 'off', '', true],
  ['isFalsy', 'zero', '', false],
  ['isFalsy', 'nil', '', false],

  ['isJson', 'json', '', true],
  ['isJson', 'list', '', true],
  ['isJson', 'plan', '', false],
  ['isJson', 'nil', '', false],

  ['isNumber', 'count', '', true],
  ['isNumber', 'numStr', '', false],
  ['isNumber', 'flag', '', false],
  ['isString', 'plan', '', true],
  ['isString', 'numStr', '', true],
  ['isString', 'count', '', false],
  ['isBoolean', 'flag', '', true],
  ['isBoolean', 'off', '', true],
  ['isBoolean', 'numStr', '', false],
  ['isBoolean', 'nil', '', false],
  ['isArray', 'list', '', true],
  ['isArray', 'emptyList', '', true],
  ['isArray', 'json', '', false],

  ['equals', 'count', '10', true],
  ['equals', 'count', '11', false],
  ['not_equals', 'count', '11', true],
  ['not_equals', 'count', '10', false],
  ['regex', 'plan', '^pre', true],
  ['regex', 'plan', '^free', false]
];

describe('mock rule operators', () => {
  describe.each(['header', 'query', 'path'])('%s target', (target) => {
    it.each(STRING_CASES)('%s %s %p -> %p', (operator, key, value, expected) => {
      expect(check(target, key, operator, value)).toBe(expected);
    });
  });

  describe('body target', () => {
    it.each(BODY_CASES)('%s $.%s %p -> %p', (operator, key, value, expected) => {
      expect(check('body', `$.${key}`, operator, value)).toBe(expected);
    });
  });

  it.each([...OPERATORS, ...LEGACY_OPERATORS])('%s has a passing and a failing case on every target', (operator) => {
    for (const cases of [STRING_CASES, BODY_CASES]) {
      const results = cases.filter(([op]) => op === operator).map(([, , , expected]) => expected);
      expect(results).toContain(true);
      expect(results).toContain(false);
    }
  });

  describe('keys', () => {
    it('matches header names case-insensitively', () => {
      expect(check('header', 'PLAN', 'eq', 'premium')).toBe(true);
    });

    it('matches query and path keys case-sensitively', () => {
      expect(check('query', 'PLAN', 'isUndefined', '')).toBe(true);
      expect(check('path', 'PLAN', 'isUndefined', '')).toBe(true);
    });

    it('reads nested body paths with or without the $. prefix', () => {
      expect(check('body', '$.user.type', 'eq', 'admin')).toBe(true);
      expect(check('body', 'user.type', 'eq', 'admin')).toBe(true);
      expect(check('body', '$.user.missing', 'isUndefined', '')).toBe(true);
    });
  });

  describe('repeated query params', () => {
    it('compares against every value', () => {
      expect(check('query', 'tags', 'contains', 'b')).toBe(true);
      expect(check('query', 'tags', 'isArray', '')).toBe(true);
      expect(check('query', 'tags', 'eq', 'a')).toBe(false);
    });
  });

  it('treats an unknown operator as legacy equals', () => {
    expect(check('header', 'plan', 'bogus', 'premium')).toBe(true);
    expect(check('header', 'plan', 'bogus', 'free')).toBe(false);
  });
});
