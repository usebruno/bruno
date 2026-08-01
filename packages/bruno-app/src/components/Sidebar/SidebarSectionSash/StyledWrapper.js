import styled from 'styled-components';

const StyledWrapper = styled.div`
  flex: 0 0 4px;
  height: 4px;
  width: 100%;
  cursor: row-resize;
  background: transparent;
  transition: background-color 0.15s ease;
  position: relative;
  z-index: 2;

  &::before {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    top: -3px;
    bottom: -3px;
  }

  &:hover,
  &.dragging {
    background: ${(props) => props.theme.sidebar.dragbar.activeBorder};
  }
`;

export default StyledWrapper;
