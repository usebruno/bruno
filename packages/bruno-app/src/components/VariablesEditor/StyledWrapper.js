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

  .flex-boundary {
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
      border-left: solid 1px ${(props) => props.theme.sidebar?.dragbar?.border || props.theme.border?.border0};
    }

    &:hover .drag-border {
      border-left-color: ${(props) => props.theme.sidebar?.dragbar?.activeBorder || props.theme.colors?.text?.link || '#546de5'};
    }
  }
`;

export default StyledWrapper;
