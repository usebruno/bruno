import styled from 'styled-components';

const StyledWrapper = styled.div`
  flex: 0 0 4px;
  height: 4px;
  width: 100%;
  cursor: row-resize;
  background: transparent;
  transition: background-color 0.15s ease;
  z-index: 1;

  &:hover,
  &.dragging {
    background: ${(props) => props.theme.sidebar.dragbar.activeBorder};
  }
`;

export default StyledWrapper;
