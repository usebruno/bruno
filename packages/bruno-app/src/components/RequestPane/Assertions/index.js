import React from 'react';
import get from 'lodash/get';
import cloneDeep from 'lodash/cloneDeep';
import { useDispatch } from 'react-redux';
import { IconTrash } from '@tabler/icons';
import { addAssertion, moveAssertion, updateAssertion, deleteAssertion } from 'providers/ReduxStore/slices/collections';
import { sendRequest, saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import { useTheme } from 'providers/Theme';
import AssertionOperator from './AssertionOperator';
import StyledWrapper from './StyledWrapper';
import Table from 'components/Table/index';
import ReorderTable from 'components/ReorderTable/index';
import SingleLineEditor from 'components/SingleLineEditor';

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

  const [operator, ...rest] = str.trim().split(' ');
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

const Assertions = ({ item, collection }) => {
  const { storedTheme } = useTheme();
  const dispatch = useDispatch();
  const assertions = item.draft ? get(item, 'draft.request.assertions') : get(item, 'request.assertions');

  const handleAddAssertion = () => {
    dispatch(
      addAssertion({
        itemUid: item.uid,
        collectionUid: collection.uid
      })
    );
  };

  const onSave = () => dispatch(saveRequest(item.uid, collection.uid));
  const handleRun = () => dispatch(sendRequest(item, collection.uid));
  const handleAssertionChange = (e, _assertion, type) => {
    const assertion = cloneDeep(_assertion);
    switch (type) {
      case 'name': {
        assertion.name = e.target.value;
        break;
      }
      case 'value': {
        assertion.value = e.target.value;
        break;
      }
      case 'enabled': {
        assertion.enabled = e.target.checked;
        break;
      }
    }
    dispatch(
      updateAssertion({
        assertion: assertion,
        itemUid: item.uid,
        collectionUid: collection.uid
      })
    );
  };

  const handleRemoveAssertion = (assertion) => {
    dispatch(
      deleteAssertion({
        assertUid: assertion.uid,
        itemUid: item.uid,
        collectionUid: collection.uid
      })
    );
  };

  const handleAssertionDrag = ({ updateReorderedItem }) => {
    dispatch(
      moveAssertion({
        collectionUid: collection.uid,
        itemUid: item.uid,
        updateReorderedItem
      })
    );
  };

  return (
    <StyledWrapper className="w-full">
      <Table
        headers={[
          { name: 'Expr', width: '37%' },
          { name: 'Operator', width: '30%' },
          { name: 'Value', width: '20%' },
          { name: '', width: '13%' }
        ]}
      >
        <ReorderTable updateReorderedItem={handleAssertionDrag}>
          {assertions && assertions.length
            ? assertions.map((assertion) => {
                const { operator, value } = parseAssertionOperator(assertion.value);

                return (
                  <tr key={assertion.uid} data-uid={assertion.uid}>
                    <td className="flex relative">
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
                                value: `${op} ${value}`
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
                          onChange={(newValue) =>
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
              })
            : null}
        </ReorderTable>
      </Table>

      <button className="btn-add-assertion text-link pr-2 py-3 mt-2 select-none" onClick={handleAddAssertion}>
        + Add Assertion
      </button>
    </StyledWrapper>
  );
};
export default Assertions;
