import React, { useState } from 'react';
import VariableScopeIcon from 'components/VariableScopeIcon';
import InlineEnvironmentCreator from './InlineEnvironmentCreator';
import StyledWrapper from './StyledWrapper';

/**
 * Displays the available scopes for saving a variable.
 *
 * @param {Array} props.scopes - Available scopes from `getAvailableAddToScopes`
 * @param {string} props.selectedScopeType - Currently selected scope type
 * @param {function} props.onSelect - Called when a scope is selected
 * @param {function} props.onCreateEnvironment - `(scope, name) => Promise`. Must return a promise. a
 *   rejection's message is shown on the row.
 * @param {string} props.testIdPrefix - Prefix for test IDs
 */
const VariableScopeList = ({ scopes, selectedScopeType, onSelect, onCreateEnvironment, testIdPrefix }) => {
  const [editingScopeType, setEditingScopeType] = useState(null);
  const [pendingScopeType, setPendingScopeType] = useState(null);
  const isCreationPending = pendingScopeType !== null;

  const createEnvironment = (scope, name) => {
    setPendingScopeType(scope.type);
    return onCreateEnvironment(scope, name).finally(() => setPendingScopeType(null));
  };

  return (
    <StyledWrapper className="var-add-to-list" aria-busy={isCreationPending} data-testid={`${testIdPrefix}-scopes`}>
      {scopes.map((scope) => {
        if (!scope.enabled) {
          return (
            <InlineEnvironmentCreator
              key={scope.type}
              scope={scope}
              isEditing={editingScopeType === scope.type}
              onStartEdit={() => setEditingScopeType(scope.type)}
              onCloseEdit={() => setEditingScopeType((current) => (current === scope.type ? null : current))}
              isSubmitting={pendingScopeType === scope.type}
              disabled={isCreationPending}
              onCreate={createEnvironment}
              testIdPrefix={testIdPrefix}
            />
          );
        }

        const isSelected = scope.type === selectedScopeType;
        return (
          <div key={scope.type} className={`var-add-to-option scope-row ${isSelected ? 'var-add-to-option-active' : ''}`}>
            <button
              type="button"
              className="var-add-to-option-trigger"
              aria-pressed={isSelected}
              disabled={isCreationPending}
              onClick={() => onSelect(scope.type)}
              data-testid={`${testIdPrefix}-scope-${scope.type}`}
            >
              <VariableScopeIcon scopeType={scope.type} />
              <span className="var-add-to-option-label">{scope.label}</span>
            </button>
          </div>
        );
      })}
    </StyledWrapper>
  );
};

export default VariableScopeList;
