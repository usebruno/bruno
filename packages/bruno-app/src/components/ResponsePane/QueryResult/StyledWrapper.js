import styled from 'styled-components';

const StyledWrapper = styled.div`
  display: flex;
  flex-direction: column;

  /* This is a hack to force Codemirror to use all available space */
  > div {
    position: relative;
  }

  div.CodeMirror {
    position: absolute;
    top: 0;
    bottom: 0;
    height: 100%;
    width: 100%;
  }

  .react-pdf__Page {
    margin-top: 10px;
    background-color: transparent !important;
  }
  .react-pdf__Page__textContent {
    border: 1px solid darkgrey;
    box-shadow: 5px 5px 5px 1px #ccc;
    border-radius: 0px;
    margin: 0 auto;
  }
  .react-pdf__Page__canvas {
    margin: 0 auto;
  }
  div[role='tablist'] {
    .active {
      color: ${(props) => props.theme.colors.text.yellow};
    }
  }

  .muted {
    color: ${(props) => props.theme.colors.text.muted};
  }

  .response-filter {
    position: absolute;
    bottom: 0;
    width: 100%;

    input {
      border: solid 1px ${(props) => props.theme.border.border2};
      border-radius: ${(props) => props.theme.border.radius.sm};
      background-color: ${(props) => props.theme.background.base};

      &:focus {
        outline: none;
      }
    }
  }
`;

export default StyledWrapper;
