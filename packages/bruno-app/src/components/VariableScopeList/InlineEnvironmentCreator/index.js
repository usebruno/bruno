import React, { useState } from 'react';
import VariableScopeIcon from 'components/VariableScopeIcon';
import StyledWrapper from './StyledWrapper';

const InlineEnvironmentCreator = ({ scope, onCreate, testIdPrefix }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [environmentName, setEnvironmentName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const testId = (part) => `${testIdPrefix}-${part}-${scope.type}`;

  const createEnvironment = () => {
    if (isSubmitting) return;
    if (!environmentName.trim()) {
      setError('Environment name is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    onCreate(scope, environmentName)
      .then(() => {
        setIsEditing(false);
        setEnvironmentName('');
      })
      .catch((createError) => setError(createError.message || 'Failed to create environment'))
      .finally(() => setIsSubmitting(false));
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      createEnvironment();
    }
  };

  return (
    <StyledWrapper>
      {isEditing ? (
        <div className="var-add-to-option is-editing">
          <input
            type="text"
            autoFocus
            disabled={isSubmitting}
            placeholder="Enter environment name"
            aria-label={`${scope.label} name`}
            className="create-env-input"
            value={environmentName}
            onChange={(event) => setEnvironmentName(event.target.value)}
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
        <div className="var-add-to-option">
          <VariableScopeIcon scopeType={scope.type} muted />
          <span className="create-env-note" data-testid={testId('no-env')}>{`No ${scope.label} selected`}</span>
          <button
            type="button"
            className="var-add-to-link-button"
            onClick={() => setIsEditing(true)}
            data-testid={testId('create-env-link')}
          >
            Create One
          </button>
        </div>
      )}
      {error ? (
        <div className="create-env-error" data-testid={testId('create-env-error')}>
          {error}
        </div>
      ) : null}
    </StyledWrapper>
  );
};

export default InlineEnvironmentCreator;
