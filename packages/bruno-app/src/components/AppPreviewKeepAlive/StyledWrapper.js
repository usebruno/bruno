import styled from 'styled-components';

const StyledWrapper = styled.div`
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  pointer-events: none;

  .app-preview-slot {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    display: flex;
    flex-direction: column;
    visibility: hidden;

    &.active {
      visibility: visible;
      pointer-events: auto;
    }
  }
`;

export default StyledWrapper;
