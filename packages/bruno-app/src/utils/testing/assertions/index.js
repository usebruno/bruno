import _ from 'lodash';

/**
 * Assertion operators
 * eq          : equal to
 * neq         : not equal to
 * gt          : greater than
 * gte         : greater than or equal to
 * lt          : less than
 * lte         : less than or equal to
 * in          : in
 * notIn       : not in
 * contains    : contains
 * notContains : not contains
 * length      : length
 * matches     : matches
 * notMatches  : not matches
 * startsWith  : starts with
 * endsWith    : ends with
 * between     : between
 * isEmpty     : is empty
 * isNull      : is null
 * isUndefined : is undefined
 * isDefined   : is defined
 * isTruthy    : is truthy
 * isFalsy     : is falsy
 * isJson      : is json
 * isNumber    : is number
 * isString    : is string
 * isBoolean   : is boolean
 * isArray     : is array
 */

export const unaryOperators = [
  'isEmpty',
  'isNull',
  'isUndefined',
  'isDefined',
  'isTruthy',
  'isFalsy',
  'isJson',
  'isNumber',
  'isString',
  'isBoolean',
  'isArray'
];

export const nonUnaryOperators = ['eq', 'neq', 'gt', 'gte', 'lt', 'lte'];

export const specialOperators = [
  'in',
  'notIn',
  'contains',
  'notContains',
  'length',
  'matches',
  'notMatches',
  'startsWith',
  'endsWith',
  'between'
];

export const operators = [...unaryOperators, ...nonUnaryOperators, ...specialOperators];

export const getOperatorLabel = (operator) => {
  switch (operator) {
    case 'eq':
      return 'equals';
    case 'neq':
      return 'notEquals';
    default:
      return operator;
  }
};

export const parseAssertion = (assertionString = '') => {
  const defaultResult = {
    operator: 'eq',
    value: ''
  };

  if (!_.isString(assertionString)) {
    return defaultResult;
  }

  const [operator, ...rest] = assertionString.trim().split(' ');
  const value = rest.join(' ');

  if (unaryOperators.includes(operator)) {
    return {
      operator,
      value: ''
    };
  } else if ([...nonUnaryOperators, ...specialOperators].includes(operator)) {
    return {
      operator,
      value
    };
  } else {
    return defaultResult;
  }
};
