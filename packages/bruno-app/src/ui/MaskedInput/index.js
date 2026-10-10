import React, { forwardRef, useState } from 'react';
import { IconEye, IconEyeOff } from '@tabler/icons';
import Input from '../Input';
import StyledWrapper from './StyledWrapper';

/**
 * MaskedInput - a secret input (token, password, API key) with a show/hide button.
 *
 * Input underneath, so it takes every Input prop: label, description, error, required, size,
 * fullWidth, leftSection, name, id, ref and so on. On top of that it owns the masking:
 * - `type` is "password" until revealed, then "text"
 * - autofill, autocorrect and autocapitalize are off unless the caller overrides them
 * - the reveal button is hidden when the field is disabled
 *
 * Visibility is uncontrolled by default. Pass `visible` (with `onVisibilityChange`) to control it.
 * `rightSection` renders after the reveal button.
 *
 * For a secret that spans several lines (a PEM key) use MaskedTextfield instead.
 *
 * `type` is ignored: the masking owns it.
 *
 * @param {boolean} props.visible - Controlled visibility state
 * @param {function} props.onVisibilityChange - Called with the next visibility: (visible: boolean) => void
 */
const MaskedInput = forwardRef(
  ({ visible: controlledVisible, onVisibilityChange, disabled = false, rightSection, type, 'data-testid': testId = 'masked-input', ...rest }, ref) => {
    // `type` is destructured only so it cannot reach Input through `rest` and fight the masking.
    void type;
    const [internalVisible, setInternalVisible] = useState(false);

    const isControlled = controlledVisible !== undefined;
    const isVisible = isControlled ? controlledVisible : internalVisible;

    const handleToggle = () => {
      const next = !isVisible;
      if (!isControlled) setInternalVisible(next);
      onVisibilityChange?.(next);
    };

    const toggle = disabled ? null : (
      <StyledWrapper
        type="button"
        onClick={handleToggle}
        aria-label={isVisible ? 'Hide value' : 'Show value'}
        data-testid={`${testId}-visibility-toggle`}
      >
        {isVisible ? <IconEyeOff size={14} strokeWidth={1.5} /> : <IconEye size={14} strokeWidth={1.5} />}
      </StyledWrapper>
    );

    return (
      <Input
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        {...rest}
        ref={ref}
        type={isVisible ? 'text' : 'password'}
        disabled={disabled}
        data-testid={testId}
        rightSection={
          toggle || rightSection ? (
            <>
              {toggle}
              {rightSection}
            </>
          ) : null
        }
      />
    );
  }
);

MaskedInput.displayName = 'MaskedInput';

export default MaskedInput;
