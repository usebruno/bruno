import styled from 'styled-components';

const StyledWrapper = styled.div`
  .caret {
    fill: currentColor;
  }

  .button-dropdown-button {
    color: ${(props) => props.theme.dropdown.primaryText};
    border-color: ${(props) => props.theme.workspace.border};

    &:hover {
      background-color: ${(props) => props.theme.dropdown.hoverBg};
    }
  }

  .dropdown-divider {
    background-color: ${(props) => props.theme.dropdown.separator};
    height: 1px;
    margin: 4px 0;
  }
`;

export default StyledWrapper;
