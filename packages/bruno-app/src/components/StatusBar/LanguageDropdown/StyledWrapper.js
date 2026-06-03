import styled from 'styled-components';

const StyledWrapper = styled.div`
  .language-menu {
    min-width: 160px;
    padding: 8px;
    background: ${(props) => props.theme.dropdown.bg};
    border: 1px solid ${(props) => props.theme.dropdown.border};
    border-radius: 6px;
    box-shadow: ${(props) => props.theme.dropdown.shadow};
    outline: none;
  }

  .language-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 30px;
    padding: 4px 8px;
    border-radius: 4px;
    cursor: pointer;
    outline: none;
    color: ${(props) => props.theme.dropdown.color};
    font-size: ${(props) => props.theme.font.size.sm};

    &:hover,
    &.focused {
      background: ${(props) => props.theme.dropdown.hoverBg};
    }

    &.active {
      color: ${(props) => props.theme.dropdown.selectedColor};
      background: ${(props) => props.theme.dropdown.selectedColor}14;
    }
  }
`;

export default StyledWrapper;
