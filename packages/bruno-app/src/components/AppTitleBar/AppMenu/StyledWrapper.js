import styled from 'styled-components';

const StyledWrapper = styled.div`
  display: flex;
  align-items: center;
  height: 100%;
  -webkit-app-region: no-drag;

  .app-menu-content {
    display: flex;
    flex-direction: column;
    min-width: 120px;
  }

  .submenu-trigger {
    position: relative;
  }

  .submenu-trigger-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 10px;
    font-size: 12px;
    cursor: pointer;
    color: ${(props) => props.theme.dropdown.color};
    border-radius: 4px;

    &:hover {
      background: ${(props) => props.theme.dropdown.hoverBg};
    }

    span {
      flex: 1;
    }

    svg {
      margin-left: 16px;
      color: ${(props) => props.theme.dropdown.mutedText};
    }
  }

  .shortcut {
    font-size: 11px;
    color: ${(props) => props.theme.dropdown.mutedText};
    margin-left: 24px;
  }
`;

export default StyledWrapper;
