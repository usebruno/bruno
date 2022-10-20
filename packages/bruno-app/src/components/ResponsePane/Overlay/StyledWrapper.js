import styled from 'styled-components';

const StyledWrapper = styled.div`
  div.overlay {
    position: absolute;
    top: 0;
    right: 0;
    left: 0;
    bottom: 0;
    z-index: 9;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding-top: 20%;
    overflow: hidden;
    text-align: center;
  }
`;

export default StyledWrapper;
