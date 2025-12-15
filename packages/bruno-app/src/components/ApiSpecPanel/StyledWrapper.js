import styled from 'styled-components';

const StyledWrapper = styled.div`
  .menu-icon {
    cursor: pointer;
    color: ${(props) => props.theme.sidebar.dropdownIcon.color};
  }

  div.dropdown-item.menu-item {
    color: ${(props) => props.theme.colors.danger};
    &:hover {
      background-color: ${(props) => props.theme.colors.bg.danger};
      color: white;
    }
  }

  .react-tooltip {
    z-index: 10;
  }
`;

export default StyledWrapper;
