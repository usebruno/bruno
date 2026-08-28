import React, { forwardRef, useContext, useId, useState } from 'react';
import { IconEye, IconEyeOff } from '@tabler/icons';
import { FieldContext } from '../Field';
import StyledWrapper from './StyledWrapper';

const Input = forwardRef(
  (
    {
      variant = 'default',
      type = 'text',
      error,
      leftSection = null,
      rightSection = null,
      leftSectionPointerEvents = 'none',
      rightSectionPointerEvents = 'auto',
      withVisibilityToggle = false,
      fullWidth = false,
      disabled = false,
      readOnly = false,
      required,
      id,
      className = '',
      'data-testid': testId = 'input',
      'aria-describedby': ariaDescribedBy,
      ...rest
    },
    ref
  ) => {
    const field = useContext(FieldContext);
    const [revealed, setRevealed] = useState(false);

    const generatedId = useId().replace(/:/g, '');

    const inputId = id ?? field?.inputId ?? generatedId;
    const hasError = Boolean(error ?? field?.hasError ?? false);
    const describedBy = ariaDescribedBy ?? field?.describedBy;
    const isRequired = required ?? field?.required;

    const canToggleVisibility = withVisibilityToggle && type === 'password';
    const resolvedType = canToggleVisibility && revealed ? 'text' : type;

    return (
      <StyledWrapper
        $ghost={variant === 'ghost'}
        $error={hasError}
        $disabled={disabled}
        $fullWidth={fullWidth}
        $leftSectionPointerEvents={leftSectionPointerEvents}
        $rightSectionPointerEvents={rightSectionPointerEvents}
        className={className}
      >
        {leftSection ? <span className="input-section input-section-left">{leftSection}</span> : null}

        <input
          ref={ref}
          id={inputId}
          type={resolvedType}
          className="input-control"
          disabled={disabled}
          readOnly={readOnly}
          required={isRequired}
          aria-describedby={describedBy}
          data-testid={testId}
          spellCheck="false"
          {...rest}
          aria-invalid={hasError || undefined}
        />

        {rightSection ? <span className="input-section input-section-right">{rightSection}</span> : null}

        {canToggleVisibility ? (
          <button
            type="button"
            className="input-visibility-toggle"
            onClick={() => setRevealed((current) => !current)}
            disabled={disabled}
            aria-label={revealed ? 'Hide value' : 'Show value'}
            data-testid={`${testId}-visibility-toggle`}
          >
            {revealed ? <IconEyeOff size={14} strokeWidth={1.5} /> : <IconEye size={14} strokeWidth={1.5} />}
          </button>
        ) : null}
      </StyledWrapper>
    );
  }
);

Input.displayName = 'Input';

export default Input;
