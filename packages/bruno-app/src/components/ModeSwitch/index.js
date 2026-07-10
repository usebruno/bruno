import React from 'react';
import styled from 'styled-components';

const StyledModeSwitch = styled.div`
  display: flex;
  align-items: center;
  background: ${(props) => props.theme.dropdown.bg};
  border: 1px solid ${(props) => props.theme.dropdown.separator};
  border-radius: 6px;
  overflow: hidden;
  padding: 2px;

  button {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 12px;
    font-size: 0.75rem;
    font-weight: 500;
    color: ${(props) => props.theme.dropdown.iconColor};
    border-radius: 4px;
    transition: all 0.2s ease;
    cursor: pointer;
    border: none;
    background: transparent;

    &:hover {
      background: ${(props) => props.theme.dropdown.hoverBg};
    }

    &.is-active {
      background: ${(props) => props.theme.dropdown.hoverBg};
      color: ${(props) => props.theme.dropdown.iconColor};
    }
    
    /* specifically for WYSIWYG */
    &.wysiwyg-btn.is-active {
      background: var(--color-orange-500, #f5a623);
      color: #fff;
    }
  }
`;

const ModeSwitch = ({ checked, onChange, leftComponent, rightComponent, className, ...props }) => {
  return (
    <StyledModeSwitch className={className} {...props}>
      <button
        type="button"
        className={`wysiwyg-btn ${!checked ? 'is-active' : ''}`}
        onClick={() => { if (checked) onChange(); }}
      >
        {leftComponent} WYSIWYG
      </button>
      <button
        type="button"
        className={`${checked ? 'is-active' : ''}`}
        onClick={() => { if (!checked) onChange(); }}
      >
        {rightComponent} Markdown
      </button>
    </StyledModeSwitch>
  );
};

export default ModeSwitch;
