import styled from 'styled-components';

const StyledWrapper = styled.div`
  &.dragging {
    cursor: col-resize;

    &.vertical-layout {
      cursor: row-resize;
    }
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

  &.vertical-layout {
    .request-pane {
      padding-bottom: 0.5rem;
    }

    .response-pane {
      padding-top: 0.5rem;
    }

    div.dragbar-wrapper {
      width: 100%;
      height: 10px;
      cursor: row-resize;
      padding: 0 1rem;
      position: relative;

      div.dragbar-handle {
        width: 100%;
        height: 1px;
        border-left: none;
        border-top: solid 1px ${(props) => props.theme.requestTabPanel.dragbar.border};
      }

      &:hover div.dragbar-handle {
        border-left: none;
        border-top: solid 1px ${(props) => props.theme.requestTabPanel.dragbar.activeBorder};
      }
    }
  }

`;

export default StyledWrapper;
