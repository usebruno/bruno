const {
  buildRequestContext,
  evaluateCondition,
  getJsonPathValue,
  matchesRules,
  selectMatchingResponse
} = require('../src/app/mock-rule-matcher');

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
