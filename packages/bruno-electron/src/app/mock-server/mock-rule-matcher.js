const { isSensitiveName, REDACTED_VALUE } = require('../../ipc/ai/context');

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

const text = (value) => (value == null ? '' : String(value));

const coerceLiteral = (raw) => {
  if (raw == null) {
    return raw;
  }

  const value = String(raw).trim();
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value === 'null') return null;
  if (value === 'undefined') return undefined;
  if (value === '') return '';
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith('\'') && value.endsWith('\''))) {
    return value.slice(1, -1);
  }
  if (!isNaN(value)) {
    const number = Number(value);
    if (number <= Number.MAX_SAFE_INTEGER) {
      return number;
    }
  }

  return value;
};

const strictlyEqual = (actual, raw) => {
  const expected = coerceLiteral(raw);
  return typeof actual === 'string' ? actual === text(raw) || actual === expected : actual === expected;
};

const asNumber = (value) => {
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '' && !isNaN(value)) {
    return Number(value);
  }
  return NaN;
};

const compareNumber = (actual, raw, predicate) => {
  const left = asNumber(actual);
  const right = asNumber(text(raw));
  return !isNaN(left) && !isNaN(right) && predicate(left, right);
};

const listItems = (raw) => {
  let value = text(raw).trim();
  if (value.startsWith('[') && value.endsWith(']')) {
    value = value.slice(1, -1);
  }
  return value.split(',').map((item) => item.trim());
};

const patternOf = (raw) => {
  const value = text(raw);
  if (value.startsWith('/') && value.endsWith('/') && value.length > 1) {
    return value.slice(1, -1);
  }
  return value;
};

const matchesPattern = (actual, raw) => {
  if (actual === undefined) {
    return false;
  }
  try {
    return new RegExp(patternOf(raw)).test(actual);
  } catch {
    return false;
  }
};

const isEmptyValue = (actual) => {
  if (actual == null) {
    return false;
  }
  if (typeof actual === 'string' || Array.isArray(actual)) {
    return actual.length === 0;
  }
  if (typeof actual === 'object') {
    return Object.keys(actual).length === 0;
  }
  return false;
};

const compareValues = (operator, actual, expected) => {
  const actualText = text(actual);
  const expectedText = text(expected);
  const found = () => (
    Array.isArray(actual)
      ? actual.some((item) => strictlyEqual(item, expected))
      : actualText.includes(expectedText)
  );
  const listed = () => listItems(expected).some((item) => strictlyEqual(actual, item));

  switch (operator) {
    case 'neq':
      return !strictlyEqual(actual, expected);
    case 'gt':
      return compareNumber(actual, expected, (left, right) => left > right);
    case 'gte':
      return compareNumber(actual, expected, (left, right) => left >= right);
    case 'lt':
      return compareNumber(actual, expected, (left, right) => left < right);
    case 'lte':
      return compareNumber(actual, expected, (left, right) => left <= right);
    case 'in':
      return listed();
    case 'notIn':
      return !listed();
    case 'contains':
      return found();
    case 'notContains':
      return !found();
    case 'length':
      return (typeof actual === 'string' || Array.isArray(actual)) && actual.length === asNumber(expectedText);
    case 'matches':
    case 'regex':
      return matchesPattern(actual, expected);
    case 'notMatches':
      try {
        new RegExp(patternOf(expected));
      } catch {
        return false;
      }
      return !matchesPattern(actual, expected);
    case 'startsWith':
      return actualText.startsWith(expectedText);
    case 'endsWith':
      return actualText.endsWith(expectedText);
    case 'between': {
      const [min, max] = listItems(expected);
      const value = asNumber(actual);
      return !isNaN(value) && value >= asNumber(min) && value <= asNumber(max);
    }
    case 'isEmpty':
      return isEmptyValue(actual);
    case 'isNotEmpty':
      return !isEmptyValue(actual) && actual != null;
    case 'isNull':
      return actual === null;
    case 'isUndefined':
      return actual === undefined;
    case 'isDefined':
      return actual !== undefined;
    case 'isTruthy':
      return actual === true;
    case 'isFalsy':
      return actual === false;
    case 'isJson':
      return actual !== null
        && typeof actual === 'object'
        && (Array.isArray(actual) || Object.prototype.toString.call(actual) === '[object Object]');
    case 'isNumber':
      return typeof actual === 'number';
    case 'isString':
      return typeof actual === 'string';
    case 'isBoolean':
      return typeof actual === 'boolean';
    case 'isArray':
      return Array.isArray(actual);
    case 'isNotNull':
      return actual !== null && actual !== undefined && actualText !== '';
    case 'not_equals':
      return actualText !== expectedText;
    case 'eq':
      return strictlyEqual(actual, expected);
    case 'equals':
    default:
      return actualText === expectedText;
  }
};

const redactActualValue = (key, actual) => {
  if (actual === undefined || actual === null) {
    return null;
  }

  return isSensitiveName(key) ? REDACTED_VALUE : actual;
};

const STRING_TARGETS = ['header', 'query'];
const TYPE_OPERATORS = new Set(['isNumber', 'isBoolean', 'isTruthy', 'isFalsy', 'isJson', 'isArray', 'isNull']);

const typedActual = (condition, actual) => {
  if (!STRING_TARGETS.includes(condition?.target) || typeof actual !== 'string' || !TYPE_OPERATORS.has(condition?.operator)) {
    return actual;
  }

  if (condition.operator === 'isJson' || condition.operator === 'isArray') {
    try {
      return JSON.parse(actual);
    } catch {
      return actual;
    }
  }

  return coerceLiteral(actual);
};

const evaluateCondition = (condition, context) => {
  if (!condition?.target) {
    return true;
  }

  const actual = getActualValue(condition, context);
  return compareValues(condition.operator || 'equals', typedActual(condition, actual), condition.value);
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
    pass: compareValues(condition.operator || 'equals', typedActual(condition, actual), condition.value),
    target: condition.target,
    key: condition.key || '',
    operator: condition.operator || 'equals',
    expected: condition.value ?? null,
    actual: redactActualValue(condition.key, actual)
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
