import React from 'react';
import Tippy from '@tippyjs/react';
import StyledWrapper from './StyledWrapper';

const Dropdown = ({ icon, children, onCreate, placement }) => {
  return (
    <StyledWrapper className="dropdown">
      <Tippy
        content={children}
        placement={placement || 'bottom-end'}
        animation={false}
        arrow={false}
        onCreate={onCreate}
        interactive={true}
        trigger="click"
        appendTo="parent"
      >
        {icon}
      </Tippy>
    </StyledWrapper>
  );
};

export default Dropdown;
