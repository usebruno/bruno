import React, { useState } from 'react';
import VariableScopeIcon from 'components/VariableScopeIcon';
import StyledWrapper from './StyledWrapper';

/**
 * Row for a scope with no active environment. `isEditing` is owned by VariableScopeList so only one
 * row shows the name input at a time.
 */
const InlineEnvironmentCreator = ({ scope, isEditing, onStartEdit, onCloseEdit, onCreate, testIdPrefix }) => {
  const [environmentName, setEnvironmentName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const testId = (part) => `${testIdPrefix}-${part}-${scope.type}`;

  const startEditing = () => {
    setEnvironmentName('');
    setError(null);
    onStartEdit();
  };

  const createEnvironment = () => {
    if (isSubmitting) return;
    if (!environmentName.trim()) {
      setError('Environment name is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    onCreate(scope, environmentName)
      .then(onCloseEdit)
      .catch((createError) => setError(createError.message || 'Failed to create environment'))
      .finally(() => setIsSubmitting(false));
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      createEnvironment();
    } else if (event.key === 'Escape') {
      // Only leave the name input; the popover around the list should stay open.
      event.stopPropagation();
      onCloseEdit();
    }
  };

  return (
    <StyledWrapper>
      {isEditing ? (
        <div className="var-add-to-option scope-row is-editing">
          <input
            type="text"
            autoFocus
            disabled={isSubmitting}
            placeholder="Enter environment name"
            aria-label={`${scope.label} name`}
            className="create-env-input"
            value={environmentName}
            onChange={(event) => {
              setEnvironmentName(event.target.value);
              setError(null);
            }}
            onKeyDown={handleKeyDown}
            data-testid={testId('create-env-input')}
          />
          <button
            type="button"
            disabled={isSubmitting}
            className="create-env-submit"
            onClick={createEnvironment}
            data-testid={testId('create-env-submit')}
          >
            {isSubmitting ? 'Creating…' : 'Create'}
          </button>
        </div>
      ) : (
        <div className="var-add-to-option scope-row">
          <VariableScopeIcon scopeType={scope.type} muted />
          <span className="create-env-note" data-testid={testId('no-env')}>{`No ${scope.label} selected`}</span>
          <button
            type="button"
            className="var-add-to-link-button"
            onClick={startEditing}
            data-testid={testId('create-env-link')}
          >
            Create One
          </button>
        </div>
      )}
      {isEditing && error ? (
        <div className="create-env-error" data-testid={testId('create-env-error')}>
          {error}
        </div>
      ) : null}
    </StyledWrapper>
  );
};

export default InlineEnvironmentCreator;
