import styled from 'styled-components';

const StyledWrapper = styled.div`
  &.dragging {
    cursor: col-resize;
  }

  div.drag-request {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 10px;
    padding: 0;
    cursor: col-resize;
    background: transparent;

    div.drag-request-border {
      display: flex;
      height: 100%;
      width: 1px;
      border-left: solid 1px var(--color-request-dragbar-background);
    }

    &:hover div.drag-request-border {
      border-left: solid 1px var(--color-request-dragbar-background-active);
    }
  }
`;

export default StyledWrapper;