import styled from 'styled-components';

const StyledWrapper = styled.div`
  position: absolute;
  z-index: 1;
  height: 75vh;
  background-color: ${(props) => props.theme.requestTabPanel.responseOverlayBg};

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

    .loading-icon {
      transform: scaleY(-1);
      animation: rotateCounterClockwise 1s linear infinite;
    }
  }
`;

export default StyledWrapper;
