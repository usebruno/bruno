import React from 'react';
import styled from 'styled-components';

// Assuming StyledWrapper is intended to apply styles directly to the ButtonBar component
const StyledButtonBar = styled.div`
  width: 100%;

  display: flex;
  flex-direction: row;
  justify-content: flex-end;
  border-top: 1px solid ${(props) => props.theme.table.border};
  background: ${(props) => props.theme.bg};

  button {
    z-index: 1;
    background: transparent;
    color: ${(props) => props.theme.text};
    padding: 0.5em 1em;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s ease-in-out;

    &:hover {
      background: ${(props) => props.theme.markDownEditor.hoverBg};
      border-color: ${(props) => props.theme.table.border};
    }

    &:last-child {
      margin-right: 0;
    }
  }


  }
  @media (max-width: 767px) {
    padding: 15px;
  }
`;

export default StyledButtonBar;
