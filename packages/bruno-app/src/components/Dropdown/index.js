import React from 'react';
import Tippy from '@tippyjs/react';
import StyledWrapper from './StyledWrapper';

// Popper modifier that forces the dropdown popover to match the width of its
// reference (trigger) element. Enabled via the `sameWidth` prop.
const sameWidthModifier = {
  name: 'sameWidth',
  enabled: true,
  phase: 'beforeWrite',
  requires: ['computeStyles'],
  fn: ({ state }) => {
    state.styles.popper.width = `${state.rects.reference.width}px`;
  },
  effect: ({ state }) => {
    state.elements.popper.style.width = `${state.elements.reference.offsetWidth}px`;
  }
};

const Dropdown = ({ icon, children, onCreate, placement, transparent, visible, appendTo, onMouseEnter, onMouseLeave, sameWidth = false, popperOptions, ...props }) => {
  // Merge the caller's popperOptions with the sameWidth modifier when requested.
  const resolvedPopperOptions = sameWidth
    ? {
        ...popperOptions,
        modifiers: [...(popperOptions?.modifiers || []), sameWidthModifier]
      }
    : popperOptions;

  const baseProps = { ...props, interactive: true, appendTo: appendTo || 'parent' };
  if (resolvedPopperOptions) {
    baseProps.popperOptions = resolvedPopperOptions;
  }

  // When in controlled mode (visible prop is provided), don't use trigger prop
  const tippyProps = visible !== undefined
    ? { ...baseProps, visible }
    : { ...baseProps, trigger: 'click' };

  return (
    <Tippy
      render={(attrs) => (
        <StyledWrapper
          className="tippy-box dropdown"
          transparent={transparent}
          tabIndex={-1}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
          {...attrs}
        >
          {children}
        </StyledWrapper>
      )}
      placement={placement || 'bottom-end'}
      animation={false}
      arrow={false}
      onCreate={onCreate}
      {...tippyProps}
    >
      {icon}
    </Tippy>
  );
};

export default Dropdown;
