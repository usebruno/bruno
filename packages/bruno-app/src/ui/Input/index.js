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
      'data-testid': testId,
      'aria-describedby': ariaDescribedBy,
      ...rest
    },
    ref
  ) => {
    const field = useContext(FieldContext);
    const generatedId = useId().replace(/:/g, '');

    const inputId = id ?? field?.inputId ?? generatedId;
    const hasError = Boolean(error ?? field?.hasError);
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
 * A single-line input with optional label, description, and error.
 *
 * Keeps the input mounted when field content changes, preserving focus
 * and cursor position. Without field content, the wrapper doesn't affect layout.
 *
 * When nested inside a Field, inherits its ID, error, and required state.
 * An error string on the Input still displays its own message.
 * Avoid passing a label if the parent Field already has one.
 *
 * className applies to the Field when a label or description is present,
 * and to the input wrapper otherwise.
 */
const Input = forwardRef(({ label, description, error, required, className, ...props }, ref) => {
  const hasLabelOrDescription = Boolean(label || description);
  const fieldClassName = hasLabelOrDescription ? className : undefined;
  const controlClassName = hasLabelOrDescription ? undefined : className;

  return (
    <Field
      label={label}
      description={description}
      error={error}
      required={required}
      htmlFor={props.id}
      className={fieldClassName}
    >
      <InputControl ref={ref} {...props} className={controlClassName} />
    </Field>
  );
});

Input.displayName = 'Input';

export default Input;
