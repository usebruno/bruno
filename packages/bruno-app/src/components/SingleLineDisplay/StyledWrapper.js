import styled from 'styled-components';

const StyledWrapper = styled.div`
  width: 100%;
  height: 30px;
  overflow-y: hidden;
  overflow-x: hidden;

  .CodeMirror {
    background: transparent;
    height: 34px;
    font-size: 14px;
    line-height: 30px;
    overflow: hidden;

    .CodeMirror-vscrollbar {
      display: none !important;
    }

    .CodeMirror-scroll {
      overflow: hidden !important;
      padding-bottom: 50px !important;
    }

    .CodeMirror-hscrollbar {
      display: none !important;
    }
    .CodeMirror-scrollbar-filler {
      display: none !important;
    }

    .CodeMirror-lines {
      padding: 0;
    }

    .CodeMirror-cursor {
      height: 20px !important;
      margin-top: 5px !important;
      border-left: 1px solid ${(props) => props.theme.text} !important;
    }

    pre {
      font-family: Inter, sans-serif !important;
      font-weight: 400;
    }

    .CodeMirror-line {
      color: ${(props) => props.theme.text};
      padding-left: 0;
      padding-right: 0;
    }
  }
`;

export default StyledWrapper;
