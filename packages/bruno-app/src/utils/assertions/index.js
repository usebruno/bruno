export const UNARY_ASSERTION_OPERATORS = [
  'isEmpty',
  'isNotEmpty',
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

export const isUnaryAssertionOperator = (operator) => UNARY_ASSERTION_OPERATORS.includes(operator);
