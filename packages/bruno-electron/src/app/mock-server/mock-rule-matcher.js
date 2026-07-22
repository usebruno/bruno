const getJsonPathValue = (body, jsonPath) => {
  if (body === undefined || body === null) {
    return undefined;
  }

  let parsed = body;
  if (typeof body === 'string') {
    try {
      parsed = JSON.parse(body);
    } catch {
      return undefined;
    }
  }

  if (!jsonPath || jsonPath === '$') {
    return parsed;
  }

  const normalizedPath = jsonPath.replace(/^\$\.?/, '');
  if (!normalizedPath) {
    return parsed;
  }

  return normalizedPath.split('.').filter(Boolean).reduce((current, key) => {
    if (current === undefined || current === null) {
      return undefined;
    }

    return current[key];
  }, parsed);
};

const getActualValue = (condition, context) => {
  const target = condition?.target;
  const key = condition?.key || '';

  if (target === 'header') {
    const headerKey = key.toLowerCase();
    return context.headers?.[headerKey];
  }

  if (target === 'query') {
    return context.query?.[key];
  }

  if (target === 'body') {
    return getJsonPathValue(context.body, key);
  }

  return undefined;
};

const compareValues = (operator, actual, expected) => {
  const actualText = actual === undefined || actual === null ? '' : String(actual);
  const expectedText = expected === undefined || expected === null ? '' : String(expected);

  switch (operator) {
    case 'regex':
      try {
        return new RegExp(expectedText).test(actualText);
      } catch {
        return false;
      }
    case 'contains':
      return actualText.includes(expectedText);
    case 'not_equals':
      return actualText !== expectedText;
    case 'equals':
    default:
      return actualText === expectedText;
  }
};

const evaluateCondition = (condition, context) => {
  if (!condition?.target) {
    return true;
  }

  const actual = getActualValue(condition, context);
  return compareValues(condition.operator || 'equals', actual, condition.value);
};

const evaluateConditionDetail = (condition, context) => {
  if (!condition?.target) {
    return {
      pass: true,
      target: null,
      key: null,
      operator: null,
      expected: null,
      actual: null
    };
  }

  const actual = getActualValue(condition, context);
  return {
    pass: compareValues(condition.operator || 'equals', actual, condition.value),
    target: condition.target,
    key: condition.key || '',
    operator: condition.operator || 'equals',
    expected: condition.value ?? null,
    actual: actual === undefined || actual === null ? null : actual
  };
};

const matchesRules = (rules, context) => {
  const conditions = rules?.conditions || [];

  if (!conditions.length) {
    return true;
  }

  const operator = rules?.operator === 'OR' ? 'OR' : 'AND';
  const results = conditions.map((condition) => evaluateCondition(condition, context));

  return operator === 'OR'
    ? results.some(Boolean)
    : results.every(Boolean);
};

const evaluateRulesDetail = (rules, context) => {
  const conditions = rules?.conditions || [];

  if (!conditions.length) {
    return {
      matched: true,
      operator: rules?.operator === 'OR' ? 'OR' : 'AND',
      conditions: [],
      isFallback: true
    };
  }

  const operator = rules?.operator === 'OR' ? 'OR' : 'AND';
  const conditionResults = conditions.map((condition) => evaluateConditionDetail(condition, context));
  const matched = operator === 'OR'
    ? conditionResults.some((result) => result.pass)
    : conditionResults.every((result) => result.pass);

  return {
    matched,
    operator,
    conditions: conditionResults,
    isFallback: false
  };
};

const buildRequestContext = (req) => {
  const headers = {};
  for (const [name, value] of Object.entries(req.headers || {})) {
    headers[name.toLowerCase()] = Array.isArray(value) ? value.join(', ') : String(value);
  }

  return {
    headers,
    query: req.query || {},
    body: req.body
  };
};

const evaluateResponseCandidates = (candidates, context) => {
  const trace = {
    candidates: [],
    selectedResponseUid: null,
    selectedResponseName: null,
    selectionReason: null,
    failureReason: null
  };

  if (!candidates?.length) {
    trace.failureReason = 'no_route';
    return { selected: null, trace };
  }

  const evaluated = candidates.map((candidate) => {
    const ruleEval = evaluateRulesDetail(candidate.rules, context);
    return {
      candidate,
      ruleEval,
      isFallback: ruleEval.isFallback
    };
  });

  const specificMatches = evaluated.filter(({ ruleEval, isFallback }) => !isFallback && ruleEval.matched);
  const fallbackMatches = evaluated.filter(({ ruleEval, isFallback }) => isFallback && ruleEval.matched);
  const selectedEntry = specificMatches[0] || fallbackMatches[0] || null;

  for (const { candidate, ruleEval, isFallback } of evaluated) {
    const isSelected = Boolean(selectedEntry && selectedEntry.candidate === candidate);

    trace.candidates.push({
      responseUid: candidate.responseUid || null,
      responseName: candidate.responseName || candidate.exampleName || 'Mock Response',
      matched: ruleEval.matched,
      selected: isSelected,
      isFallback,
      ruleOperator: ruleEval.operator,
      conditions: ruleEval.conditions
    });
  }

  if (selectedEntry) {
    trace.selectedResponseUid = selectedEntry.candidate.responseUid || null;
    trace.selectedResponseName = selectedEntry.candidate.responseName || selectedEntry.candidate.exampleName || 'Mock Response';
    trace.selectionReason = selectedEntry.isFallback ? 'fallback' : 'specific_rules';
    return { selected: selectedEntry.candidate, trace };
  }

  trace.failureReason = 'no_rule_match';
  return { selected: null, trace };
};

const selectMatchingResponse = (candidates, context) => (
  evaluateResponseCandidates(candidates, context).selected
);

module.exports = {
  buildRequestContext,
  compareValues,
  evaluateCondition,
  evaluateConditionDetail,
  evaluateResponseCandidates,
  evaluateRulesDetail,
  getJsonPathValue,
  matchesRules,
  selectMatchingResponse
};
