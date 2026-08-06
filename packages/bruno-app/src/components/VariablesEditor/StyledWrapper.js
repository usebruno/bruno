import styled from 'styled-components';

const StyledWrapper = styled.div`
  height: 100%;
  width: 100%;
  display: flex;
  overflow: hidden;

  .variables-main {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  /*
   * Deliberately not .flex-boundary — that class name belongs to the
   * ui/HeightBoundContainer primitive, and useTrackScroll resolves it as the
   * scroll container. This pane stacks two tables rather than one filling
   * child, so it owns its own scroller under its own name.
   */
  .variables-scroll {
    flex: 1;
    min-height: 0;
    overflow: auto;
    /* Prevent browser scroll anchoring from fighting our restored scrollTop */
    overflow-anchor: none;
  }

  .section-title {
    font-weight: 500;
  }

  .muted {
    color: ${(props) => props.theme.colors.text.muted};
  }

  .details-panel-wrapper {
    position: relative;
    flex-shrink: 0;
    height: 100%;
    display: flex;
  }

  .details-drag-handle {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    cursor: col-resize;
    background-color: transparent;
    width: 6px;
    position: absolute;
    left: -3px;
    top: 0;
    z-index: 10;

    .drag-border {
      width: 1px;
      height: 100%;
      border-left: solid 1px ${(props) => props.theme.sidebar.dragbar.border};
    }

    &:hover .drag-border {
      border-left-color: ${(props) => props.theme.sidebar.dragbar.activeBorder};
    }
  }
`;

export default StyledWrapper;
