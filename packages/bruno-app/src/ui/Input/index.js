import React, { forwardRef, useContext, useId } from 'react';
import Field, { FieldContext } from '../Field';
import StyledWrapper from './StyledWrapper';

const InputControl = forwardRef(
  (
    {
      variant = 'default',
      size = 'md',
      type = 'text',
      error,
      leftSection = null,
      rightSection = null,
      leftSectionPointerEvents = 'none',
      rightSectionPointerEvents = 'auto',
      fullWidth = false,
      disabled = false,
      readOnly = false,
      required,
      id,
      name,
      className = '',
      'data-testid': testId = 'input',
      'aria-describedby': ariaDescribedBy,
      ...rest
    },
    ref
  ) => {
    const field = useContext(FieldContext);
    const generatedId = useId().replace(/:/g, '');

    const inputId = id ?? field?.inputId ?? generatedId;
    const hasError = Boolean(error ?? field?.hasError ?? false);
    const describedBy = ariaDescribedBy ?? field?.describedBy;
    const isRequired = required ?? field?.required;

    return (
      <StyledWrapper
        $ghost={variant === 'ghost'}
        $size={size}
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
          name={name ?? id}
          type={type}
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
      </StyledWrapper>
    );
  }
);

InputControl.displayName = 'InputControl';

/**
 * A single-line text input with optional field support.
 *
 * Automatically wraps in Field when `label`, `description`, or a string `error`
 * is provided. Otherwise, renders a standalone input.
 */
const Input = forwardRef(({ label, description, error, required, ...props }, ref) => {
  const hasField = Boolean(label || description || typeof error === 'string');

  if (!hasField) {
    return <InputControl ref={ref} error={error} required={required} {...props} />;
  }

  return (
    <Field label={label} description={description} error={error} required={required} htmlFor={props.id}>
      <InputControl ref={ref} {...props} />
    </Field>
  );
});

Input.displayName = 'Input';

export default Input;
