import styled from 'styled-components';

const StyledWrapper = styled.div`
  position: absolute;
  height: 100%;
  z-index: 1;
  background-color: ${(props) => props.theme.requestTabPanel.responseOverlayBg};

  div.overlay {
    z-index: 9;
    display: flex;
    flex-direction: column;
    align-items: center;
    overflow: hidden;
    text-align: center;

    .loading-icon {
      transform: scaleY(-1);
      animation: rotateCounterClockwise 1s linear infinite;
    }
  }
`;

export default StyledWrapper;
