import React, { useCallback } from 'react';
import get from 'lodash/get';
import { useDispatch, useSelector } from 'react-redux';
import { useTheme } from 'providers/Theme';
import { moveAssertion, setRequestAssertions } from 'providers/ReduxStore/slices/collections';
import { sendRequest, saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import { updateTableColumnWidths } from 'providers/ReduxStore/slices/tabs';
import SingleLineEditor from 'components/SingleLineEditor';
import AssertionOperator from './AssertionOperator';
import EditableTable from 'components/EditableTable';
import StyledWrapper from './StyledWrapper';
import { selectActiveTabUid, selectActiveTabTableColumnWidths } from 'src/selectors/tabs';

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

const parseAssertionOperator = (str = '') => {
  if (!str || typeof str !== 'string' || !str.length) {
    return { operator: 'eq', value: str };
  }

  const operators = [
    'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'notIn',
    'contains', 'notContains', 'length', 'matches', 'notMatches',
    'startsWith', 'endsWith', 'between', ...unaryOperators
  ];

  const [operator, ...rest] = str.split(' ');
  const value = rest.join(' ');

  if (unaryOperators.includes(operator)) {
    return { operator, value: '' };
  }

  if (operators.includes(operator)) {
    return { operator, value };
  }

  return { operator: 'eq', value: str };
};

const isUnaryOperator = (operator) => unaryOperators.includes(operator);

const Assertions = ({ item, collection }) => {
  const dispatch = useDispatch();
  const { storedTheme } = useTheme();
  const activeTabUid = useSelector(selectActiveTabUid);
  const tableColumnWidths = useSelector(selectActiveTabTableColumnWidths);
  const assertions = item.draft ? get(item, 'draft.request.assertions') : get(item, 'request.assertions');

  // Get column widths from Redux
  const assertionsWidths = tableColumnWidths['assertions'] || {};

  const handleColumnWidthsChange = (tableId, widths) => {
    dispatch(updateTableColumnWidths({ uid: activeTabUid, tableId, widths }));
  };

  const onSave = () => dispatch(saveRequest(item.uid, collection.uid));
  const handleRun = () => dispatch(sendRequest(item, collection.uid));

  const handleAssertionsChange = useCallback((updatedAssertions) => {
    dispatch(setRequestAssertions({
      collectionUid: collection.uid,
      itemUid: item.uid,
      assertions: updatedAssertions
    }));
  }, [dispatch, collection.uid, item.uid]);

  const handleAssertionDrag = useCallback(({ updateReorderedItem }) => {
    dispatch(moveAssertion({
      collectionUid: collection.uid,
      itemUid: item.uid,
      updateReorderedItem
    }));
  }, [dispatch, collection.uid, item.uid]);

  const columns = [
    {
      key: 'name',
      name: 'Expr',
      isKeyField: true,
      placeholder: 'Expr',
      width: '30%'
    },
    {
      key: 'operator',
      name: 'Operator',
      width: '120px',
      getValue: (row) => parseAssertionOperator(row.value).operator,
      render: ({ row, rowIndex, isLastEmptyRow }) => {
        const { operator } = parseAssertionOperator(row.value);
        const assertionValue = parseAssertionOperator(row.value).value;

        const handleOperatorChange = (newOperator) => {
          const currentAssertions = assertions || [];
          const existingAssertion = currentAssertions.find((a) => a.uid === row.uid);
          const newValue = isUnaryOperator(newOperator) ? newOperator : `${newOperator} ${assertionValue}`;

          if (existingAssertion) {
            const updatedAssertions = currentAssertions.map((assertion) => {
              if (assertion.uid === row.uid) {
                return {
                  ...assertion,
                  value: newValue
                };
              }
              return assertion;
            });
            handleAssertionsChange(updatedAssertions);
          } else {
            handleAssertionsChange([...currentAssertions, { ...row, value: newValue }]);
          }
        };

        return (
          <AssertionOperator
            operator={operator}
            onChange={handleOperatorChange}
          />
        );
      }
    },
    {
      key: 'value',
      name: 'Value',
      width: '30%',
      render: ({ row, value, onChange }) => {
        const { operator, value: assertionValue } = parseAssertionOperator(value);

        if (isUnaryOperator(operator)) {
          return <input type="text" className="cursor-default" disabled />;
        }

        return (
          <SingleLineEditor
            value={assertionValue}
            theme={storedTheme}
            onSave={onSave}
            onChange={(newValue) => onChange(`${operator} ${newValue}`)}
            onRun={handleRun}
            collection={collection}
            item={item}
            placeholder={!value ? 'Value' : ''}
          />
        );
      }
    }
  ];

  const defaultRow = {
    name: '',
    value: 'eq ',
    operator: 'eq'
  };

  return (
    <StyledWrapper className="w-full">
      <EditableTable
        tableId="assertions"
        columns={columns}
        rows={assertions || []}
        onChange={handleAssertionsChange}
        defaultRow={defaultRow}
        reorderable={true}
        onReorder={handleAssertionDrag}
        testId="assertions-table"
        columnWidths={assertionsWidths}
        onColumnWidthsChange={(widths) => handleColumnWidthsChange('assertions', widths)}
      />
    </StyledWrapper>
  );
};

export default Assertions;
