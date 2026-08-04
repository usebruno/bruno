import React, { useCallback, useMemo } from 'react';
import EditableTable from 'components/EditableTable';
import { usePersistedState } from 'hooks/usePersistedState';
import VariableValue from '../VariableValue';
import StyledWrapper from './StyledWrapper';

const secretRevealKey = (section, name) => `${section}:${name}`;

const VariablesTable = ({
  rows,
  collection,
  selectedName,
  section,
  revealedSecrets,
  onToggleSecretReveal,
  onOpenObject,
  columnWidths,
  onColumnWidthsChange,
  objectExpandedStorageKey,
  testId
}) => {
  const [expandedMap, setExpandedMap] = usePersistedState({
    key: objectExpandedStorageKey,
    default: {}
  });

  const handleToggleExpanded = useCallback((name, path) => {
    setExpandedMap((prev) => {
      const paths = new Set(prev?.[name] || []);
      if (paths.has(path)) paths.delete(path);
      else paths.add(path);
      return { ...prev, [name]: [...paths] };
    });
  }, []);

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
          value={row.value}
          secret={row.secret}
          collection={collection}
          isSelected={selectedName === row.name && !!selectedName}
          revealed={!!revealedSecrets?.has(secretRevealKey(section, row.name))}
          onToggleReveal={() => onToggleSecretReveal?.(section, row.name)}
          onOpenObject={() => onOpenObject?.({ section, name: row.name })}
          expandedPaths={expandedMap?.[row.name] || []}
          onToggleExpanded={(path) => handleToggleExpanded(row.name, path)}
        />
      )
    }
  ], [
    collection,
    selectedName,
    section,
    revealedSecrets,
    onToggleSecretReveal,
    onOpenObject,
    expandedMap,
    handleToggleExpanded
  ]);

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
        initialScroll={0}
        sortStorageKey={`variables-sort-${section}`}
      />
    </StyledWrapper>
  );
};

export default VariablesTable;
