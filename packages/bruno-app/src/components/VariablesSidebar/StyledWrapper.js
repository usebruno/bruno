import styled from 'styled-components';

const StyledWrapper = styled.div`
  flex-shrink: 0;
  height: 100%;
  position: relative;

  .variables-sidebar {
    width: 100%;
    height: 100%;
    background: ${(props) => props.theme.bg};
    color: ${(props) => props.theme.text};
    border-left: 1px solid ${(props) => props.theme.border.border1};
    display: flex;
    flex-direction: column;
  }

  .variables-sidebar-resize-handle {
    position: absolute;
    top: 0;
    left: -3px;
    width: 6px;
    height: 100%;
    display: flex;
    justify-content: center;
    cursor: col-resize;
    z-index: 5;

    .drag-border {
      width: 1px;
      height: 100%;
      border-left: solid 1px transparent;
    }

    &:hover .drag-border {
      border-left-color: ${(props) => props.theme.sidebar.dragbar.border};
    }
  }

  .variables-sidebar-header {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    border-bottom: 1px solid ${(props) => props.theme.border.border1};

    .header-title {
      flex: 1;
      min-width: 0;
      font-size: 14px;
      font-weight: 500;
      color: ${(props) => props.theme.text};
    }

    .icon-btn {
      padding: 5px;
      background: transparent;
      border: none;
      border-radius: ${(props) => props.theme.border.radius.sm};
      cursor: pointer;
      color: ${(props) => props.theme.colors.text.muted};
      display: flex;
      align-items: center;
      justify-content: center;

      &:hover {
        background: ${(props) => props.theme.background.surface0};
        color: ${(props) => props.theme.text};
      }
    }
  }

  .variables-sidebar-body {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }

  .variables-sidebar-tabs {
    padding: 8px 12px 0;
  }

  .variables-sidebar-content {
    position: relative;
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }

  .variables-sidebar-scroll {
    flex: 1;
    min-height: 0;
    overflow: auto;
    overflow-anchor: none;
    padding: 14px 12px 12px;

    &.is-covered {
      visibility: hidden;
    }
  }

  .object-view-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
  }

  .empty-note {
    padding: 4px 10px;
    color: ${(props) => props.theme.colors.text.muted};
    font-size: 12px;
  }
`;

export default StyledWrapper;
