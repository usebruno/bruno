import styled from 'styled-components';

const StyledWrapper = styled.div`
  .menu-icon {
    cursor: pointer;
    color: ${(props) => props.theme.sidebar.dropdownIcon.color};
  }

  div.dropdown-item.menu-item {
    color: ${(props) => props.theme.colors.text.danger};
    &:hover {
      background-color: ${(props) => props.theme.colors.bg.danger};
      color: white;
    }
  }

  .react-tooltip {
    z-index: 10;
  }

  section.main.dragging {
    cursor: col-resize;
    user-select: none;
  }

  div.dragbar-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 10px;
    min-width: 10px;
    padding: 0;
    cursor: col-resize;
    background: transparent;
    position: relative;
    flex-shrink: 0;

    div.dragbar-handle {
      display: flex;
      height: 100%;
      width: 1px;
      border-left: solid 1px ${(props) => props.theme.requestTabPanel.dragbar.border};
    }

    &:hover div.dragbar-handle {
      border-left: solid 1px ${(props) => props.theme.requestTabPanel.dragbar.activeBorder};
    }
  }
`;

export default StyledWrapper;
