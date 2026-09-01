import React, { createContext, useId, useMemo } from 'react';
import StyledWrapper from './StyledWrapper';

// Carries the generated id, helper-text id, error and required state down to the
// control. Defaults to null so a control renders fine with no Field around it.
export const FieldContext = createContext(null);

/**
 * Label + control + one slot shared by `description` and `error` (the error wins).
 *
 * `error` takes the Formik/Yup value, not a boolean: a string renders as the message,
 */
const Field = ({
  label,
  description,
  error,
  required = false,
  htmlFor,
  children,
  className = '',
  'data-testid': testId = 'field'
}) => {
  const generatedId = useId().replace(/:/g, '');
  const inputId = htmlFor ?? generatedId;
  const helperId = `${inputId}-helper`;

  const errorMessage = typeof error === 'string' ? error : null;
  const hasError = Boolean(error);
  const helper = errorMessage ?? description ?? null;

  const context = useMemo(
    () => ({
      inputId,
      describedBy: helper ? helperId : undefined,
      hasError,
      required
    }),
    [inputId, helperId, helper, hasError, required]
  );

  return (
    <FieldContext.Provider value={context}>
      <StyledWrapper className={className} $error={hasError} data-testid={testId}>
        {label ? (
          <label className={`field-label${required ? ' is-required' : ''}`} htmlFor={inputId}>
            {label}
          </label>
        ) : null}

        {children}

        {helper ? (
          <div className="field-helper" id={helperId} role={hasError ? 'alert' : undefined}>
            {helper}
          </div>
        ) : null}
      </StyledWrapper>
    </FieldContext.Provider>
  );
};

export default Field;
