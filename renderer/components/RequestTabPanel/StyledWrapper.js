import styled from 'styled-components';

const StyledWrapper = styled.div`
  div.drag-request {
    display: flex;
    width: 0.5rem;
    padding: 0;
    cursor: col-resize;
    background: transparent;
    border-left: solid 1px var(--color-request-dragbar-background);

    &:hover {
      border-left: solid 1px var(--color-request-dragbar-background-active);
    }
  }
`;

export default StyledWrapper;