import React from 'react';
import { IconTrash } from '@tabler/icons';
import SingleLineEditor from 'components/SingleLineEditor';
import AssertionOperator from '../AssertionOperator';
import { useTheme } from 'providers/Theme';

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
const parseAssertionOperator = (str = '') => {
  if (!str || typeof str !== 'string' || !str.length) {
    return {
      operator: 'eq',
      value: str
    };
  }

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

  const unaryOperators = [
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

  const [operator, ...rest] = str.split(' ');
  const value = rest.join(' ');

  if (unaryOperators.includes(operator)) {
    return {
      operator,
      value: ''
    };
  }

  if (operators.includes(operator)) {
    return {
      operator,
      value
    };
  }

  return {
    operator: 'eq',
    value: str
  };
};

const isUnaryOperator = (operator) => {
  const unaryOperators = [
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

  return unaryOperators.includes(operator);
};

const AssertionRow = ({
  item,
  collection,
  assertion,
  handleAssertionChange,
  handleRemoveAssertion,
  onSave,
  handleRun
}) => {
  const { storedTheme } = useTheme();

  const { operator, value } = parseAssertionOperator(assertion.value);

  return (
    <tr key={assertion.uid}>
      <td>
        <input
          type="text"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
          value={assertion.name}
          className="mousetrap"
          onChange={(e) => handleAssertionChange(e, assertion, 'name')}
        />
      </td>
      <td>
        <AssertionOperator
          operator={operator}
          onChange={(op) =>
            handleAssertionChange(
              {
                target: {
                  value: isUnaryOperator(op) ? op : `${op} ${value}`
                }
              },
              assertion,
              'value'
            )
          }
        />
      </td>
      <td>
        {!isUnaryOperator(operator) ? (
          <SingleLineEditor
            value={value}
            theme={storedTheme}
            readOnly={true}
            onSave={onSave}
            onChange={(newValue) => {
              handleAssertionChange(
                {
                  target: {
                    value: `${operator} ${newValue}`
                  }
                },
                assertion,
                'value'
              )
              }
            }
            onRun={handleRun}
            collection={collection}
            item={item}
          />
        ) : (
          <input type="text" className="cursor-default" disabled />
        )}
      </td>
      <td>
        <div className="flex items-center">
          <input
            type="checkbox"
            checked={assertion.enabled}
            tabIndex="-1"
            className="mr-3 mousetrap"
            onChange={(e) => handleAssertionChange(e, assertion, 'enabled')}
          />
          <button tabIndex="-1" onClick={() => handleRemoveAssertion(assertion)}>
            <IconTrash strokeWidth={1.5} size={20} />
          </button>
        </div>
      </td>
    </tr>
  );
};

export default AssertionRow;
