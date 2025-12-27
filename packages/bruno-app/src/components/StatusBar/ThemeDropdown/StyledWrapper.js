import styled from 'styled-components';
import { rgba } from 'polished';

const StyledWrapper = styled.div`
  .theme-menu {
    min-width: 160px;
    padding: 4px 0;
    background: ${(props) => props.theme.dropdown.bg};
    border: 1px solid ${(props) => props.theme.dropdown.separator};
    border-radius: ${(props) => props.theme.border.radius.md};
    box-shadow: ${(props) => props.theme.dropdown.shadow};
  }

  .menu-label {
    padding: 6px 12px 4px;
    font-size: 11px;
    font-weight: 500;
    text-transform: uppercase;
    color: ${(props) => props.theme.dropdown.mutedText};
    letter-spacing: 0.5px;
  }

  .menu-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 12px;
    cursor: pointer;
    color: ${(props) => props.theme.dropdown.color};
    font-size: ${(props) => props.theme.font.size.sm};

    &:hover {
      background: ${(props) => props.theme.dropdown.hoverBg};
    }

    &.active {
      color: ${(props) => props.theme.dropdown.selectedColor};
      background: ${(props) => rgba(props.theme.dropdown.selectedColor, 0.07)};
    }

    &.has-submenu {
      padding-right: 8px;
    }
  }

  .menu-item-icon {
    margin-right: 8px;
    opacity: 0.7;
  }

  .menu-item-label {
    flex: 1;
  }

  .check-icon {
    color: ${(props) => props.theme.dropdown.selectedColor};
    margin-left: 8px;
  }

  .chevron-icon {
    opacity: 0.6;
    margin-left: 8px;
  }

  .menu-divider {
    height: 1px;
    background: ${(props) => props.theme.dropdown.separator};
    margin: 4px 0;
  }

  .submenu {
    min-width: 180px;
    padding: 4px 0;
    background: ${(props) => props.theme.dropdown.bg};
    border: 1px solid ${(props) => props.theme.dropdown.separator};
    border-radius: ${(props) => props.theme.border.radius.md};
    box-shadow: ${(props) => props.theme.dropdown.shadow};
  }
`;

export default StyledWrapper;
