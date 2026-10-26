import React from 'react';
import VariableScopeIcon from 'components/VariableScopeIcon';
import InlineEnvironmentCreator from './InlineEnvironmentCreator';
import StyledWrapper from './StyledWrapper';

/**
 * Displays the available scopes for saving a variable.
 *
 * The parent provides the scopes, manages selection, and handles environment creation.
 * Scopes without an environment show an option to create one.
 *
 * @param {Array} props.scopes - Available scopes from `getAvailableAddToScopes`
 * @param {string} props.selectedScopeType - Currently selected scope type
 * @param {function} props.onSelect - Called when a scope is selected
 * @param {function} props.onCreateEnvironment - Creates an environment; errors are shown inline
 * @param {string} props.testIdPrefix - Prefix for test IDs
 */
const VariableScopeList = ({ scopes, selectedScopeType, onSelect, onCreateEnvironment, testIdPrefix }) => (
  <StyledWrapper className="var-add-to-list" data-testid={`${testIdPrefix}-scopes`}>
    {scopes.map((scope) => {
      if (!scope.enabled) {
        return (
          <InlineEnvironmentCreator
            key={scope.type}
            scope={scope}
            onCreate={onCreateEnvironment}
            testIdPrefix={testIdPrefix}
          />
        );
      }

      const isSelected = scope.type === selectedScopeType;
      return (
        <div key={scope.type} className={`var-add-to-option ${isSelected ? 'var-add-to-option-active' : ''}`}>
          <button
            type="button"
            className="var-add-to-option-trigger"
            aria-pressed={isSelected}
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

export default VariableScopeList;
