import React from 'react';
import { IconPlus, IconTrash } from '@tabler/icons';
import StyledWrapper from './StyledWrapper';

const TARGET_OPTIONS = [
  { value: 'header', label: 'Header' },
  { value: 'query', label: 'Query' },
  { value: 'body', label: 'Body (JSON path)' }
];

const OPERATOR_OPTIONS = [
  { value: 'equals', label: 'equals' },
  { value: 'not_equals', label: 'not equals' },
  { value: 'contains', label: 'contains' },
  { value: 'regex', label: 'regex' }
];

const MockResponseRules = ({ rules, editMode, onChange, embedded = false }) => {
  const conditions = rules?.conditions || [];
  const operator = rules?.operator === 'OR' ? 'OR' : 'AND';

  const updateRules = (nextRules) => {
    onChange(nextRules);
  };

  const updateCondition = (index, patch) => {
    const nextConditions = conditions.map((condition, conditionIndex) => (
      conditionIndex === index ? { ...condition, ...patch } : condition
    ));
    updateRules({ operator, conditions: nextConditions });
  };

  const addCondition = () => {
    updateRules({
      operator,
      conditions: [
        ...conditions,
        {
          target: 'header',
          key: '',
          operator: 'equals',
          value: ''
        }
      ]
    });
  };

  const removeCondition = (index) => {
    updateRules({
      operator,
      conditions: conditions.filter((_, conditionIndex) => conditionIndex !== index)
    });
  };

  return (
    <StyledWrapper className={embedded ? 'rules-panel embedded' : 'rules-panel'}>
      <div className={`flex items-center mb-3 ${embedded ? 'justify-end' : 'justify-between'}`}>
        {!embedded ? <div className="font-medium text-sm">Response rules</div> : null}
        <div className="flex items-center gap-2 text-xs">
          <label htmlFor="mock-response-rule-operator">Match</label>
          <select
            id="mock-response-rule-operator"
            className="rule-operator"
            value={operator}
            disabled={!editMode}
            onChange={(event) => updateRules({ operator: event.target.value, conditions })}
          >
            <option value="AND">ALL (AND)</option>
            <option value="OR">ANY (OR)</option>
          </select>
        </div>
      </div>

      {conditions.length === 0 ? (
        <div className="text-xs opacity-70 mb-3">
          No rules. This response matches every request on the route.
        </div>
      ) : null}

      {conditions.map((condition, index) => (
        <div className="rule-row" key={`rule-${index}`}>
          <select
            value={condition.target || 'header'}
            disabled={!editMode}
            onChange={(event) => updateCondition(index, { target: event.target.value })}
          >
            {TARGET_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>

          <input
            type="text"
            placeholder={condition.target === 'body' ? '$.user.type' : 'name'}
            value={condition.key || ''}
            disabled={!editMode}
            onChange={(event) => updateCondition(index, { key: event.target.value })}
          />

          <select
            value={condition.operator || 'equals'}
            disabled={!editMode}
            onChange={(event) => updateCondition(index, { operator: event.target.value })}
          >
            {OPERATOR_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>

          <input
            type="text"
            placeholder="value"
            value={condition.value || ''}
            disabled={!editMode}
            onChange={(event) => updateCondition(index, { value: event.target.value })}
          />

          {editMode ? (
            <button type="button" className="action-btn" onClick={() => removeCondition(index)} title="Remove rule">
              <IconTrash size={14} />
            </button>
          ) : null}
        </div>
      ))}

      {editMode ? (
        <button type="button" className="add-rule-btn mt-2" onClick={addCondition}>
          <IconPlus size={14} className="mr-1" />
          Add rule
        </button>
      ) : null}
    </StyledWrapper>
  );
};

export default MockResponseRules;
