const {
  buildRequestContext,
  evaluateCondition,
  evaluateResponseCandidates,
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

    expect(evaluateCondition({
      target: 'header',
      key: 'X-Plan',
      operator: 'not_equals',
      value: 'free'
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
