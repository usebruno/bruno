import React from 'react';
import Tippy from '@tippyjs/react';
import StyledWrapper from './StyledWrapper';
import { createPortal } from 'react-dom';

const Dropdown = ({ icon, children, onCreate, placement, transparent, visible, portalElement, ...props }) => {
  // When in controlled mode (visible prop is provided), don't use trigger prop
  const tippyProps
    = visible !== undefined
      ? { ...props, visible, interactive: true, appendTo: 'parent' }
      : { ...props, trigger: 'click', interactive: true, appendTo: 'parent' };

  if (portalElement)
    return createPortal(
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
      </StyledWrapper>,
      portalElement
    );

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
