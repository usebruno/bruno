import styled from 'styled-components';

const StyledWrapper = styled.div`
  position: relative;
  height: 100%;

  .copy-to-clipboard {
    position: absolute;
    cursor: pointer;
    top: 10px;
    right: 10px;
    z-index: 10;
    opacity: 0.5;

    &:hover {
      opacity: 1;
    }
  }
`;

export default StyledWrapper;
