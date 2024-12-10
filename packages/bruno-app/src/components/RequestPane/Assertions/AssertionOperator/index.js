import React from 'react';

/**
 * Assertion operators
 *
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
 * isNotEmpty  : is not empty
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

const AssertionOperator = ({ operator, onChange }) => {
  const operators = [
    'eq',
    'neq',
    'gt',
    'gte',
    'lt',
    'lte',
    'in',
    'notIn',
    'contains',
    'notContains',
    'length',
    'matches',
    'notMatches',
    'startsWith',
    'endsWith',
    'between',
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

  const handleChange = (e) => {
    onChange(e.target.value);
  };

  const getLabel = (operator) => {
    switch (operator) {
      case 'eq':
        return 'equals';
      case 'neq':
        return 'notEquals';
      default:
        return operator;
    }
  };

  return (
    <select value={operator} onChange={handleChange} className="mousetrap">
      {operators.map((operator) => (
        <option key={operator} value={operator}>
          {getLabel(operator)}
        </option>
      ))}
    </select>
  );
};

export default AssertionOperator;
