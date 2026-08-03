import React, { useMemo } from 'react';
import EditableTable from 'components/EditableTable';
import VariableValue from '../VariableValue';
import StyledWrapper from './StyledWrapper';

const VariablesTable = ({
  rows,
  collection,
  selectedName,
  section,
  onOpenObject,
  columnWidths,
  onColumnWidthsChange,
  testId
}) => {
  const columns = useMemo(() => [
    {
      key: 'name',
      name: 'Name',
      isKeyField: true,
      sortable: true,
      readOnly: true,
      width: '35%'
    },
    {
      key: 'value',
      name: 'Value',
      width: '65%',
      render: ({ row }) => (
        <VariableValue
          name={row.name}
          value={row.value}
          secret={row.secret}
          collection={collection}
          isSelected={selectedName === row.name && !!selectedName}
          onOpenObject={() => onOpenObject?.({ section, name: row.name })}
        />
      )
    }
  ], [collection, selectedName, section, onOpenObject]);

  return (
    <StyledWrapper>
      <EditableTable
        tableId={`variables-${section}`}
        testId={testId || `variables-${section}-table`}
        columns={columns}
        rows={rows}
        onChange={() => {}}
        showCheckbox={false}
        showDelete={false}
        showAddRow={false}
        columnWidths={columnWidths}
        onColumnWidthsChange={onColumnWidthsChange}
        // Do NOT pass page scroll as initialScroll — EditableTable treats it as
        // initialTopMostItemIndex (scroll / 35). With two tables sharing one
        // scroll parent that causes jump fights on remount.
        initialScroll={0}
        sortStorageKey={`variables-sort-${section}`}
      />
    </StyledWrapper>
  );
};

export default VariablesTable;
