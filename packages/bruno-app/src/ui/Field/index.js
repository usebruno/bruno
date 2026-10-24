import React, { createContext, useContext, useId, useMemo } from 'react';
import StyledWrapper from './StyledWrapper';

// Carries the generated id, helper-text id, error and required state down to the
// control. Defaults to null so a control renders fine with no Field around it.
export const FieldContext = createContext(null);

/**
 * Renders a label, control, and a shared space for description or error.
 *
 * A string error displays an alert message. Other truthy values only mark
 * the control as invalid, keeping the description visible.
 */
const Field = ({
  label,
  description,
  error,
  required = false,
  htmlFor,
  children,
  className = '',
  'data-testid': testId
}) => {
  const parent = useContext(FieldContext);
  const generatedId = useId().replace(/:/g, '');
  const inputId = htmlFor ?? parent?.inputId ?? generatedId;
  const helperId = `${generatedId}-helper`;

  const errorMessage = typeof error === 'string' ? error : null;
  const hasOwnError = Boolean(error);
  const hasError = hasOwnError || Boolean(parent?.hasError);
  const isRequired = required || Boolean(parent?.required);
  const helper = errorMessage ?? description ?? null;

  const context = useMemo(
    () => ({
      inputId,
      describedBy: helper ? helperId : parent?.describedBy,
      hasError,
      required: isRequired
    }),
    [inputId, helperId, helper, parent?.describedBy, hasError, isRequired]
  );

  return (
    <FieldContext.Provider value={context}>
      <StyledWrapper className={className} $error={hasOwnError} $bare={!label && !helper} data-testid={testId}>
        {label ? (
          <label className={`field-label${isRequired ? ' is-required' : ''}`} htmlFor={inputId}>
            {label}
          </label>
        ) : null}

        {children}

        {helper ? (
          <div className="field-helper" id={helperId} role={errorMessage ? 'alert' : undefined}>
            {helper}
          </div>
        ) : null}
      </StyledWrapper>
    </FieldContext.Provider>
  );
};

export default Field;
