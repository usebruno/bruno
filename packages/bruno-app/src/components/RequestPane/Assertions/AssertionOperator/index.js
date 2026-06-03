import React from 'react';
import { useTranslation } from 'react-i18next';

const AssertionOperator = ({ operator, onChange }) => {
  const { t } = useTranslation();

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

  const getLabel = (op) => {
    // 将驼峰命名转换为下划线命名，然后转为大写
    const snakeCase = op.replace(/([a-z])([A-Z])/g, '$1_$2').toUpperCase();
    const translationKey = `REQUEST_PANE.ASSERTION_OP_${snakeCase}`;
    const translated = t(translationKey);
    return translated !== translationKey ? translated : op;
  };

  return (
    <select value={operator} onChange={handleChange} className="mousetrap" data-testid="assertion-operator-select">
      {operators.map((op) => (
        <option key={op} value={op}>
          {getLabel(op)}
        </option>
      ))}
    </select>
  );
};

export default AssertionOperator;
