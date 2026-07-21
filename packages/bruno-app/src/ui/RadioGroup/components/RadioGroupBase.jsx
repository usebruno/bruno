import React, { createContext, forwardRef, useId, useMemo } from 'react';
import StyledWrapper from './StyledWrapper';

/**
 * Context shared with the <Radio> children: selected value, change handler,
 * the group's input name, and the group-level disabled flag.
 */
export const RadioGroupContext = createContext(null);
RadioGroupContext.displayName = 'RadioGroupContext';

/**
 * RadioGroupBase — the compound implementation of the radio group.
 *
 * Internal: not exported from the package's public entry (index.jsx), which
 * exposes only the data-driven list API. Kept as a compound component (context
 * + <Radio> children) so a compound API can be surfaced later with no rewrite.
 *
 * Uses native radio inputs for keyboard navigation and accessibility. If no
 * `name` is provided, one is generated automatically. The radiogroup always
 * receives an accessible name: pass `label` for a visible label, `ariaLabelledBy`
 * to reference an external one, or `ariaLabel` when no visible label exists.
 * The ref is forwarded to the root element; additional props to the radiogroup.
 */
const RadioGroupBase = forwardRef(({
  value,
  onChange,
  name,
  label,
  ariaLabel,
  ariaLabelledBy,
  orientation = 'vertical',
  size = 'md',
  disabled = false,
  className = '',
  dataTestId = 'radio-group',
  children,
  ...rest
}, ref) => {
  const generatedId = useId();
  const groupName = name || `${generatedId}-group`;
  const labelId = label ? `${generatedId}-label` : undefined;
  const resolvedLabelledBy = ariaLabelledBy || labelId;
  const resolvedLabel = resolvedLabelledBy ? undefined : ariaLabel;

  if (process.env.NODE_ENV !== 'production' && !resolvedLabelledBy && !resolvedLabel) {
    console.warn(
      'RadioGroup is missing an accessible name. Provide `label`, `ariaLabel`, or `ariaLabelledBy`.'
    );
  }

  const contextValue = useMemo(
    () => ({ value, onChange, name: groupName, disabled }),
    [value, onChange, groupName, disabled]
  );

  return (
    <StyledWrapper ref={ref} $orientation={orientation} $size={size} className={className}>
      {label && (
        <div className="radio-group-label" id={labelId}>
          {label}
        </div>
      )}
      <RadioGroupContext.Provider value={contextValue}>
        <div
          {...rest}
          className="radio-group-options"
          role="radiogroup"
          aria-labelledby={resolvedLabelledBy}
          aria-label={resolvedLabel}
          data-testid={dataTestId}
        >
          {children}
        </div>
      </RadioGroupContext.Provider>
    </StyledWrapper>
  );
});

RadioGroupBase.displayName = 'RadioGroupBase';

export default RadioGroupBase;
