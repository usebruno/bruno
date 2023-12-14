import styled from 'styled-components';

const StyledWrapper = styled.div`
  position: relative;

  .copy-to-clipboard {
    position: absolute;
    cursor: pointer;
    top: 0px;
    right: 0px;
    z-index: 10;
    opacity: 0.5;

    &:hover {
      opacity: 1;
    }
  }
`;

export default StyledWrapper;
