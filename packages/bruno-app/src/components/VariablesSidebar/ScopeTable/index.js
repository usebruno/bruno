import React, { useMemo } from 'react';
import EditableTable from 'components/EditableTable';
import VariableCell from '../VariableCell';
import StyledWrapper from './StyledWrapper';

const ScopeTable = ({
  section,
  collection,
  item,
  addToScopes,
  columnWidths,
  onColumnWidthsChange,
  isSecretRevealed,
  onToggleSecretReveal,
  onOpenObject,
  actions
}) => {
  const columns = useMemo(() => [
    {
      key: 'name',
      name: 'Name',
      isKeyField: true,
      readOnly: true,
      width: '40%',
      render: ({ row }) => (
        <span className="variable-name" title={row.locations?.join(', ') || row.name}>{row.name}</span>
      )
    },
    {
      key: 'value',
      name: 'Value',
      width: '60%',
      render: ({ row }) => (
        <VariableCell
          section={section}
          row={row}
          collection={collection}
          item={item}
          addToScopes={addToScopes}
          revealed={isSecretRevealed(section, row.name)}
          onToggleReveal={() => onToggleSecretReveal(section, row.name)}
          onOpenObject={() => onOpenObject({ sectionKey: section.key, name: row.name })}
          actions={actions}
        />
      )
    }
  ], [section, collection, item, addToScopes, isSecretRevealed, onToggleSecretReveal, onOpenObject, actions]);

  return (
    <StyledWrapper>
      <EditableTable
        tableId="variables-sidebar"
        testId={`variables-sidebar-${section.key}-table`}
        columns={columns}
        rows={section.rows}
        showCheckbox={false}
        showDelete={false}
        showAddRow={false}
        columnWidths={columnWidths}
        onColumnWidthsChange={onColumnWidthsChange}
        initialScroll={0}
      />
    </StyledWrapper>
  );
};

export default ScopeTable;
