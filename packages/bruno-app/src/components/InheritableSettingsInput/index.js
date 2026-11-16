import React, { useRef } from 'react';
import { Tooltip } from 'react-tooltip';
import FormField from 'ui/patterns/FormField';
import StyledWrapper from './StyledWrapper';

const InheritableSettingsInput = ({
  id,
  label,
  description,
  value,
  inheritedValue,
  inheritedPlaceholder,
  sourceName,
  onSourceClick,
  sourceLinkLabel,
  isInherited,
  onValueChange,
  onOverride,
  onInherit,
  onKeyDown,
  overrideLabel,
  inheritLabel,
  inheritTooltip,
  testId = id
}) => {
  const inputRef = useRef(null);
  const descriptionId = description ? `${id}-description` : undefined;
  const statusId = `${id}-status`;

  const handleChange = (e) => {
    const next = e.target.value;
    if (next === '') {
      onInherit();
    } else if (/^\d+$/.test(next)) {
      onValueChange(parseInt(next, 10));
    }
  };

  const handleOverride = () => {
    onOverride();
    inputRef.current?.focus();
  };

  return (
    <StyledWrapper>
      <FormField
        layout="inline"
        label={(
          <span className="inheritable-label">
            {label}
            {/* Visual only: screen readers get "Inherited" from the status line the input points to */}
            {isInherited && (
              <span className="inheritable-tag" aria-hidden="true" data-testid={`${testId}-inherited-tag`}>
                Inherited
              </span>
            )}
          </span>
        )}
        description={description}
        htmlFor={id}
        descriptionId={descriptionId}
        controlWidth="max-content"
      >
        <div className="inheritable-control">
          <input
            ref={inputRef}
            id={id}
            type="text"
            inputMode="numeric"
            className="settings-text-input inheritable-input block px-2 py-1 w-24 h-[34px]"
            aria-describedby={[descriptionId, isInherited ? statusId : null].filter(Boolean).join(' ') || undefined}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            placeholder={isInherited ? (inheritedPlaceholder ?? String(inheritedValue)) : undefined}
            value={isInherited ? '' : String(value)}
            onChange={handleChange}
            onKeyDown={onKeyDown}
            data-testid={`${testId}-input`}
          />
          <div className="inheritable-status">
            {isInherited ? (
              <>
                <span id={statusId} data-testid={`${testId}-inherited`}>
                  <span className="sr-only">Inherited </span>
                  From{' '}
                  <button
                    type="button"
                    className="inheritable-source"
                    onClick={onSourceClick}
                    aria-label={sourceLinkLabel}
                    data-testid={`${testId}-source`}
                  >
                    {sourceName}
                  </button>
                </span>
                <span className="inheritable-separator" aria-hidden="true">·</span>
                <button
                  type="button"
                  className="inheritable-link"
                  onClick={handleOverride}
                  aria-label={overrideLabel}
                  data-testid={`${testId}-override`}
                >
                  Override
                </button>
              </>
            ) : (
              <>
                <button
                  id={`${id}-inherit`}
                  type="button"
                  className="inheritable-link"
                  onClick={onInherit}
                  aria-label={inheritLabel}
                  data-testid={`${testId}-inherit`}
                >
                  Inherit
                </button>
                {inheritTooltip && (
                  <Tooltip anchorId={`${id}-inherit`} className="tooltip-mod font-normal" place="right" html={inheritTooltip} />
                )}
              </>
            )}
          </div>
        </div>
      </FormField>
    </StyledWrapper>
  );
};

export default InheritableSettingsInput;
