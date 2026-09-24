import React, { useEffect, useMemo, useRef } from 'react';
import EditableTable from 'components/EditableTable';
import { uuid } from 'utils/common';
import StyledWrapper from './StyledWrapper';

const TARGET_OPTIONS = [
  { value: 'header', label: 'Header' },
  { value: 'query', label: 'Query' },
  { value: 'body', label: 'Body' }
];

const OPERATOR_OPTIONS = [
  { value: 'equals', label: 'equals' },
  { value: 'not_equals', label: 'not equals' },
  { value: 'contains', label: 'contains' },
  { value: 'matches', label: 'matches' }
];

const DEFAULT_CONDITION = {
  target: 'header',
  key: '',
  operator: 'equals',
  value: ''
};

const KEY_PLACEHOLDERS = {
  body: '$.user.type',
  query: 'page',
  header: 'x-api-key'
};

const MockResponseRules = ({ rules, editMode, onChange, onAddRule }) => {
  const conditions = rules?.conditions || [];
  const operator = rules?.operator === 'OR' ? 'OR' : 'AND';
  const rowUidsRef = useRef([]);
  const wrapperRef = useRef(null);
  const focusAddRowPendingRef = useRef(false);

  const handleAddRule = () => {
    focusAddRowPendingRef.current = true;
    onAddRule();
  };

  useEffect(() => {
    if (!editMode || !focusAddRowPendingRef.current) {
      return;
    }

    focusAddRowPendingRef.current = false;

    let attempts = 0;
    const interval = setInterval(() => {
      attempts += 1;
      const keyInput = wrapperRef.current
        ?.querySelector('tbody tr:last-child [data-testid="column-key"] input');

      if (keyInput) {
        keyInput.focus();
        clearInterval(interval);
      } else if (attempts >= 20) {
        clearInterval(interval);
      }
    }, 25);

    return () => clearInterval(interval);
  }, [editMode]);

  const rows = useMemo(() => conditions.map((condition, index) => {
    if (condition.uid) {
      return condition;
    }

    rowUidsRef.current[index] = rowUidsRef.current[index] || uuid();
    return { ...condition, uid: rowUidsRef.current[index] };
  }), [conditions]);

  const handleRowsChange = (updatedRows) => {
    onChange({
      operator,
      conditions: updatedRows.map((row) => ({
        uid: row.uid,
        target: row.target || DEFAULT_CONDITION.target,
        key: row.key || '',
        operator: row.operator || DEFAULT_CONDITION.operator,
        value: row.value || ''
      }))
    });
  };

  const columns = [
    {
      key: 'target',
      name: 'Target',
      width: '20%',
      render: ({ value, onChange: onCellChange }) => (
        <select
          value={value || DEFAULT_CONDITION.target}
          disabled={!editMode}
          onChange={(event) => onCellChange(event.target.value)}
          aria-label="Rule target"
        >
          {TARGET_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      )
    },
    {
      key: 'key',
      name: 'Key',
      isKeyField: true,
      width: '27%',
      readOnly: !editMode,
      placeholder: KEY_PLACEHOLDERS.header,
      render: ({ row, value, onChange: onCellChange }) => (
        <input
          type="text"
          autoComplete="off"
          spellCheck="false"
          className="mousetrap"
          value={value || ''}
          readOnly={!editMode}
          placeholder={KEY_PLACEHOLDERS[row.target] || KEY_PLACEHOLDERS.header}
          onChange={(event) => onCellChange(event.target.value)}
        />
      )
    },
    {
      key: 'operator',
      name: 'Operator',
      width: '22%',
      render: ({ value, onChange: onCellChange }) => (
        <select
          value={value === 'regex' ? 'matches' : (value || DEFAULT_CONDITION.operator)}
          disabled={!editMode}
          onChange={(event) => onCellChange(event.target.value)}
          aria-label="Rule operator"
        >
          {OPERATOR_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      )
    },
    {
      key: 'value',
      name: 'Value',
      width: '31%',
      readOnly: !editMode,
      placeholder: 'Value'
    }
  ];

  return (
    <StyledWrapper ref={wrapperRef}>
      <div className="flex items-center justify-between mb-3 text-xs">
        <div className="flex items-center gap-2">
          <label htmlFor="mock-response-rule-operator" className="font-medium">Match</label>
          <select
            id="mock-response-rule-operator"
            className="rule-operator"
            value={operator}
            disabled={!editMode}
            onChange={(event) => onChange({ operator: event.target.value, conditions })}
          >
            <option value="AND">All rules (AND)</option>
            <option value="OR">Any rule (OR)</option>
          </select>
        </div>
        {!editMode ? (
          <button
            type="button"
            className="add-rule-link"
            onClick={handleAddRule}
            data-testid="mock-response-add-rule-btn"
          >
            + Add Rule
          </button>
        ) : null}
      </div>

      {rows.length === 0 && !editMode ? (
        <div className="text-xs opacity-70">
          No rules - every request on this route gets this response.
        </div>
      ) : (
        <EditableTable
          tableId="mock-response-rules"
          columns={columns}
          rows={rows}
          onChange={handleRowsChange}
          defaultRow={DEFAULT_CONDITION}
          showCheckbox={false}
          showAddRow={editMode}
          showDelete={editMode}
          testId="mock-response-rules-table"
        />
      )}
    </StyledWrapper>
  );
};

export default MockResponseRules;
