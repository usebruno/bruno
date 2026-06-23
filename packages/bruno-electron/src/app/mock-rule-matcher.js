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

const selectMatchingResponse = (candidates, context) => {
  if (!candidates?.length) {
    return null;
  }

  for (const candidate of candidates) {
    if (matchesRules(candidate.rules, context)) {
      return candidate;
    }
  }

  return null;
};

module.exports = {
  buildRequestContext,
  compareValues,
  evaluateCondition,
  getJsonPathValue,
  matchesRules,
  selectMatchingResponse
};
