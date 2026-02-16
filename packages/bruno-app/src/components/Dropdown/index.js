import React from 'react';
import Tippy from '@tippyjs/react';
import StyledWrapper from './StyledWrapper';

const Dropdown = ({ icon, children, onCreate, placement, transparent, visible, appendTo, onMouseEnter, onMouseLeave, ...props }) => {
  // When in controlled mode (visible prop is provided), don't use trigger prop
  const tippyProps = visible !== undefined
    ? { ...props, visible, interactive: true, appendTo: appendTo || 'parent' }
    : { ...props, trigger: 'click', interactive: true, appendTo: appendTo || 'parent' };

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
