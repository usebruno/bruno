import React, { useState } from 'react';
import { SCOPE_ICON } from 'utils/codemirror/scopeIcons';
import StyledWrapper from './StyledWrapper';

/** One "Save to" row. Without an active environment it shows "Create One" instead. */
const EnvironmentTargetOption = ({ target, isSelected, onSelect, onCreate }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [environmentName, setEnvironmentName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const createEnvironment = () => {
    if (isSubmitting) return;
    setError(null);
    setIsSubmitting(true);
    onCreate(environmentName)
      .catch((createError) => setError(createError.message))
      .finally(() => setIsSubmitting(false));
  };

  const handleCreateKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      createEnvironment();
    }
  };

  const targetIcon = (
    <span
      className={`target-icon target-icon-${target.type} ${target.enabled ? '' : 'target-icon-muted'}`}
      dangerouslySetInnerHTML={{ __html: SCOPE_ICON[target.type] }}
    />
  );

  if (target.enabled) {
    return (
      <StyledWrapper className={isSelected ? 'target-selected' : ''}>
        <button
          type="button"
          className="target-trigger"
          data-testid={`secret-variable-target-${target.type}`}
          aria-pressed={isSelected}
          onClick={() => onSelect(target.type)}
        >
          {targetIcon}
          <span className="target-label" title={target.label}>{target.label}</span>
        </button>
      </StyledWrapper>
    );
  }

  return (
    <StyledWrapper className="flex-wrap">
      {targetIcon}
      {isCreating ? (
        <>
          <input
            type="text"
            className="create-environment-input"
            placeholder="Enter environment name"
            aria-label={`${target.label} name`}
            data-testid={`secret-variable-create-env-input-${target.type}`}
            value={environmentName}
            disabled={isSubmitting}
            autoFocus
            onChange={(event) => setEnvironmentName(event.target.value)}
            onKeyDown={handleCreateKeyDown}
          />
          <button
            type="button"
            className="create-environment-button"
            data-testid={`secret-variable-create-env-submit-${target.type}`}
            disabled={isSubmitting}
            onClick={createEnvironment}
          >
            {isSubmitting ? 'Creating…' : 'Create'}
          </button>
          {error && (
            <div className="create-environment-error" data-testid={`secret-variable-create-env-error-${target.type}`}>
              {error}
            </div>
          )}
        </>
      ) : (
        <span className="target-note" data-testid={`secret-variable-no-env-${target.type}`}>
          No {target.label} selected.{' '}
          <button
            type="button"
            className="create-environment-link"
            data-testid={`secret-variable-create-env-link-${target.type}`}
            onClick={() => setIsCreating(true)}
          >
            Create One
          </button>
        </span>
      )}
    </StyledWrapper>
  );
};

export default EnvironmentTargetOption;
