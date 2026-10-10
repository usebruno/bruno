import React, { forwardRef, useState } from 'react';
import { IconEye, IconEyeOff } from '@tabler/icons';
import Input from '../Input';
import StyledWrapper from './StyledWrapper';

/**
 * A masked input for passwords, tokens, and API keys.
 *
 * Supports all Input props and adds a show/hide toggle.
 * Visibility is managed internally unless controlled through `visible` and `onVisibilityChange`.
 *
 * Disables autocomplete, autocorrect, and autocapitalization by default.
 * `rightSection` renders after the visibility toggle.
 *
 * For multiline secrets, use MaskedTextfield instead.
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
