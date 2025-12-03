import React from 'react';
import Tippy from '@tippyjs/react';
import StyledWrapper from './StyledWrapper';

const Dropdown = ({ icon, children, onCreate, placement, transparent, visible, ...props }) => {
  // When in controlled mode (visible prop is provided), don't use trigger prop
  const tippyProps = visible !== undefined
    ? { ...props, visible, interactive: true, appendTo: 'parent' }
    : { ...props, trigger: 'click', interactive: true, appendTo: 'parent' };

  return (
    <StyledWrapper className="dropdown" transparent={transparent}>
      <Tippy
        content={children}
        placement={placement || 'bottom-end'}
        animation={false}
        arrow={false}
        onCreate={onCreate}
        {...tippyProps}
      >
        {icon}
      </Tippy>
    </StyledWrapper>
  );
};

export default Dropdown;
