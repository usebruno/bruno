const {
  buildRequestContext,
  compareValues,
  evaluateCondition,
  evaluateResponseCandidates,
  getJsonPathValue,
  matchesRules,
  selectMatchingResponse
} = require('../src/app/mock-server/mock-rule-matcher');

describe('mock-rule-matcher', () => {
  const context = {
    headers: { 'x-plan': 'premium' },
    query: { status: 'active' },
    body: { user: { type: 'admin' } }
  };

  it('reads json path values from body', () => {
    expect(getJsonPathValue(context.body, '$.user.type')).toBe('admin');
    expect(getJsonPathValue('{"id":1}', '$.id')).toBe(1);
  });

  it('evaluates header, query, and body conditions', () => {
    expect(evaluateCondition({
      target: 'header',
      key: 'X-Plan',
      operator: 'equals',
      value: 'premium'
    }, context)).toBe(true);

    expect(evaluateCondition({
      target: 'query',
      key: 'status',
      operator: 'equals',
      value: 'active'
    }, context)).toBe(true);

    expect(evaluateCondition({
      target: 'body',
      key: '$.user.type',
      operator: 'equals',
      value: 'admin'
    }, context)).toBe(true);

    expect(evaluateCondition({
      target: 'header',
      key: 'X-Plan',
      operator: 'eq',
      value: 'premium'
    }, context)).toBe(true);

    expect(evaluateCondition({
      target: 'header',
      key: 'X-Plan',
      operator: 'eq',
      value: '"premium"'
    }, context)).toBe(true);

    expect(evaluateCondition({
      target: 'header',
      key: 'X-Plan',
      operator: 'neq',
      value: 'free'
    }, context)).toBe(true);

    expect(evaluateCondition({
      target: 'header',
      key: 'X-Plan',
      operator: 'isNotNull',
      value: ''
    }, context)).toBe(true);

    expect(evaluateCondition({
      target: 'header',
      key: 'X-Missing',
      operator: 'isNotNull',
      value: ''
    }, context)).toBe(false);

    expect(evaluateCondition({
      target: 'header',
      key: 'X-Plan',
      operator: 'not_equals',
      value: 'free'
    }, context)).toBe(true);

    expect(evaluateCondition({
      target: 'header',
      key: 'X-Plan',
      operator: 'matches',
      value: '^pre'
    }, context)).toBe(true);

    // legacy operator name still works
    expect(evaluateCondition({
      target: 'query',
      key: 'status',
      operator: 'regex',
      value: 'act.*'
    }, context)).toBe(true);
  });

  it('evaluates every assertion operator', () => {
    const cases = [
      ['eq', 'premium', 'premium', true],
      ['eq', 'premium', '"premium"', true],
      ['eq', 'premium', 'free', false],
      ['eq', 2, '2', true],
      ['in', 'premium', '"premium", "free"', true],
      ['neq', 'premium', 'free', true],
      ['gt', '10', '2', true],
      ['gt', '2', '10', false],
      ['gte', 2, '2', true],
      ['lt', 1, '2', true],
      ['lte', 2, '2', true],
      ['in', 'active', 'active, paused', true],
      ['in', 'free', '[active, paused]', false],
      ['notIn', 'free', 'active, paused', true],
      ['contains', 'premium', 'pre', true],
      ['contains', ['a', 'b'], 'b', true],
      ['notContains', 'premium', 'free', true],
      ['length', 'abcd', '4', true],
      ['length', ['a'], '2', false],
      ['matches', 'premium', '/^pre/', true],
      ['notMatches', 'premium', '^free', true],
      ['notMatches', 'premium', '(', false],
      ['startsWith', 'premium', 'pre', true],
      ['endsWith', 'premium', 'ium', true],
      ['between', '5', '1, 10', true],
      ['between', '11', '1, 10', false],
      ['isEmpty', '', '', true],
      ['isEmpty', 'a', '', false],
      ['isEmpty', undefined, '', false],
      ['isNotEmpty', 'a', '', true],
      ['isNotEmpty', '', '', false],
      ['isNull', null, '', true],
      ['isNull', undefined, '', false],
      ['isUndefined', undefined, '', true],
      ['isUndefined', '', '', false],
      ['isDefined', '', '', true],
      ['isDefined', undefined, '', false],
      ['isTruthy', true, '', true],
      ['isTruthy', 'true', '', false],
      ['isFalsy', false, '', true],
      ['isJson', { ok: true }, '', true],
      ['isJson', 'ok', '', false],
      ['isNumber', 2, '', true],
      ['isNumber', '2', '', false],
      ['isString', '2', '', true],
      ['isBoolean', false, '', true],
      ['isArray', ['a'], '', true],
      ['isArray', { ok: true }, '', false]
    ];

    cases.forEach(([operator, actual, expected, pass]) => {
      expect([operator, String(actual), compareValues(operator, actual, expected)]).toEqual([operator, String(actual), pass]);
    });
  });

  it('applies type operators to header and query strings', () => {
    const ctx = buildRequestContext({
      headers: {
        'x-n': '1',
        'x-b': 'true',
        'x-j': '{"ok":true}',
        'x-a': '["value"]',
        'x-z': 'null'
      },
      query: { f: 'false' },
      body: {}
    });

    expect(evaluateCondition({ target: 'header', key: 'X-N', operator: 'isNumber' }, ctx)).toBe(true);
    expect(evaluateCondition({ target: 'header', key: 'X-B', operator: 'isTruthy' }, ctx)).toBe(true);
    expect(evaluateCondition({ target: 'header', key: 'X-B', operator: 'isBoolean' }, ctx)).toBe(true);
    expect(evaluateCondition({ target: 'header', key: 'X-J', operator: 'isJson' }, ctx)).toBe(true);
    expect(evaluateCondition({ target: 'header', key: 'X-A', operator: 'isArray' }, ctx)).toBe(true);
    expect(evaluateCondition({ target: 'header', key: 'X-Z', operator: 'isNull' }, ctx)).toBe(true);
    expect(evaluateCondition({ target: 'query', key: 'f', operator: 'isFalsy' }, ctx)).toBe(true);
    expect(evaluateCondition({ target: 'header', key: 'X-N', operator: 'length', value: '1' }, ctx)).toBe(true);
  });

  it('distinguishes a missing header from an empty one and from JSON null', () => {
    const missing = buildRequestContext({
      headers: {},
      query: {},
      body: { note: null, count: 2, items: ['a'] }
    });
    const empty = buildRequestContext({
      headers: { 'x-plan': '' },
      query: {},
      body: {}
    });

    expect(evaluateCondition({ target: 'header', key: 'X-Plan', operator: 'isUndefined' }, missing)).toBe(true);
    expect(evaluateCondition({ target: 'header', key: 'X-Plan', operator: 'isNull' }, missing)).toBe(false);
    expect(evaluateCondition({ target: 'header', key: 'X-Plan', operator: 'isDefined' }, missing)).toBe(false);
    expect(evaluateCondition({ target: 'header', key: 'X-Plan', operator: 'isEmpty' }, empty)).toBe(true);
    expect(evaluateCondition({ target: 'header', key: 'X-Plan', operator: 'isUndefined' }, empty)).toBe(false);
    expect(evaluateCondition({ target: 'body', key: '$.note', operator: 'isNull' }, missing)).toBe(true);
    expect(evaluateCondition({ target: 'body', key: '$.count', operator: 'gt', value: '1' }, missing)).toBe(true);
    expect(evaluateCondition({ target: 'body', key: '$.items', operator: 'contains', value: 'a' }, missing)).toBe(true);
  });

  it('matches AND and OR rule groups', () => {
    expect(matchesRules({
      operator: 'AND',
      conditions: [
        { target: 'header', key: 'X-Plan', operator: 'equals', value: 'premium' },
        { target: 'query', key: 'status', operator: 'equals', value: 'active' }
      ]
    }, context)).toBe(true);

    expect(matchesRules({
      operator: 'OR',
      conditions: [
        { target: 'query', key: 'status', operator: 'equals', value: 'inactive' },
        { target: 'body', key: '$.user.type', operator: 'equals', value: 'admin' }
      ]
    }, context)).toBe(true);
  });

  it('selects first matching candidate in order', () => {
    const selected = selectMatchingResponse([
      {
        exampleName: 'premium',
        rules: {
          operator: 'AND',
          conditions: [{ target: 'header', key: 'X-Plan', operator: 'equals', value: 'premium' }]
        }
      },
      {
        exampleName: 'default',
        rules: { operator: 'AND', conditions: [] }
      }
    ], context);

    expect(selected.exampleName).toBe('premium');
  });

  it('returns match trace with per-condition results', () => {
    const { selected, trace } = evaluateResponseCandidates([
      {
        responseUid: 'premium',
        responseName: 'premium',
        rules: {
          operator: 'AND',
          conditions: [{ target: 'header', key: 'X-Plan', operator: 'equals', value: 'free' }]
        }
      },
      {
        responseUid: 'default',
        responseName: 'default',
        rules: { operator: 'AND', conditions: [] }
      }
    ], context);

    expect(selected.responseName).toBe('default');
    expect(trace.failureReason).toBeNull();
    expect(trace.selectionReason).toBe('fallback');
    expect(trace.selectedResponseUid).toBe('default');
    expect(trace.candidates).toHaveLength(2);
    expect(trace.candidates[0].matched).toBe(false);
    expect(trace.candidates[0].selected).toBe(false);
    expect(trace.candidates[0].conditions[0].pass).toBe(false);
    expect(trace.candidates[1].matched).toBe(true);
    expect(trace.candidates[1].selected).toBe(true);
    expect(trace.candidates[1].isFallback).toBe(true);
  });

  it('prefers specific rule match over earlier fallback candidate', () => {
    const { selected, trace } = evaluateResponseCandidates([
      {
        responseUid: 'fallback',
        responseName: 'fallback',
        rules: { operator: 'AND', conditions: [] }
      },
      {
        responseUid: 'specific',
        responseName: 'specific',
        rules: {
          operator: 'AND',
          conditions: [{ target: 'query', key: 'code', operator: 'equals', value: '400' }]
        }
      }
    ], {
      headers: {},
      query: { code: '400' },
      body: {}
    });

    expect(selected.responseUid).toBe('specific');
    expect(trace.selectionReason).toBe('specific_rules');
    expect(trace.candidates[0].matched).toBe(true);
    expect(trace.candidates[0].selected).toBe(false);
    expect(trace.candidates[1].selected).toBe(true);
  });

  it('returns no_rule_match trace when every candidate fails', () => {
    const { selected, trace } = evaluateResponseCandidates([
      {
        responseUid: 'premium',
        responseName: 'premium',
        rules: {
          operator: 'AND',
          conditions: [{ target: 'header', key: 'X-Plan', operator: 'equals', value: 'free' }]
        }
      }
    ], context);

    expect(selected).toBeNull();
    expect(trace.failureReason).toBe('no_rule_match');
    expect(trace.candidates[0].matched).toBe(false);
  });

  it('redacts sensitive rule values from the match trace without changing matching', () => {
    const { selected, trace } = evaluateResponseCandidates([
      {
        responseUid: 'authed',
        responseName: 'authed',
        rules: {
          operator: 'AND',
          conditions: [{ target: 'header', key: 'Authorization', operator: 'contains', value: 'Bearer' }]
        }
      }
    ], {
      headers: { authorization: 'Bearer super-secret-token' },
      query: {},
      body: {}
    });

    expect(selected.responseUid).toBe('authed');
    expect(trace.candidates[0].conditions[0].pass).toBe(true);
    expect(trace.candidates[0].conditions[0].actual).toBe('<redacted>');
    expect(JSON.stringify(trace)).not.toContain('super-secret-token');
  });

  it('builds request context from express req', () => {
    const built = buildRequestContext({
      headers: { 'content-type': 'application/json', 'X-Plan': 'free' },
      query: { page: '2' },
      body: { ok: true }
    });

    expect(built.headers['x-plan']).toBe('free');
    expect(built.query.page).toBe('2');
    expect(built.body.ok).toBe(true);
  });
});
