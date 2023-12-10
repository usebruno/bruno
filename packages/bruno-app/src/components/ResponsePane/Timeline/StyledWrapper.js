import styled from 'styled-components';

const StyledWrapper = styled.div`
  /* This is a hack to force headers-pane use all available space.*/
  position: relative;

  > div:nth-child(2) {
    position: absolute;
    top: 2rem;
    bottom: 0;
    width: 100%;
    height: 100%;
  }

  .line {
    white-space: pre-line;
    word-wrap: break-word;
    word-break: break-all;
    font-family: Inter, sans-serif !important;

    .arrow {
      opacity: 0.5;
    }

    &.request {
      color: ${(props) => props.theme.colors.text.green};
    }

    &.response {
      color: ${(props) => props.theme.colors.text.purple};
    }
  }
`;

export default StyledWrapper;
