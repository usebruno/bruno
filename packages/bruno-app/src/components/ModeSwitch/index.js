import React from 'react';
import styled from 'styled-components';

const StyledModeSwitch = styled.div`
  display: flex;
  align-items: center;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid ${(props) => props.theme.dropdown.separator};

  button {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 4px 12px;
    font-size: 0.75rem;
    font-weight: 500;
    color: ${(props) => props.theme.colors.text.muted};
    transition: all 0.2s ease;
    cursor: pointer;
    border: none;
    background: transparent;

    &:hover {
      color: ${(props) => props.theme.text};
      background: ${(props) => props.theme.dropdown.hoverBg};
    }

    &.is-active {
      color: ${(props) => props.theme.button2.color['primary']?.bg};
      background: ${(props) => props.theme.dropdown.hoverBg};
    }
  }
`;

const ModeSwitch = ({ checked, onChange, compact, className, ...props }) => {
  return (
    <StyledModeSwitch className={className} {...props}>
      <button
        type="button"
        className={`${!checked ? 'is-active' : ''}`}
        onClick={() => { if (checked) onChange(); }}
      >
        <span className="mode-text">Rich Text</span>
      </button>
      <button
        type="button"
        className={`${checked ? 'is-active' : ''}`}
        onClick={() => { if (!checked) onChange(); }}
      >
        <span className="mode-text">Markdown</span>
      </button>
    </StyledModeSwitch>
  );
};

export default ModeSwitch;
