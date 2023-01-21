import styled from 'styled-components';

const StyledWrapper = styled.div`
  width: 100%;
  height: 30px;
  overflow-y: hidden;

  .CodeMirror {
    background: transparent;
    height: 30px;
    font-size: 14px;
    line-height: 30px;

    .CodeMirror-lines {
      padding: 0;
    }

    .CodeMirror-cursor {
      height: 20px !important;
      margin-top: 5px !important;
    }

    pre {
      font-family: Inter, sans-serif !important;
      font-weight: 400;
      }
  }

  .tooltip {
    position: absolute;
    top: 0;
    left: 0;
    background: #fff;
    border: 1px solid #ccc;
    border-radius: 3px;
    padding: 5px;
    font-size: 12px;
    z-index: 100;
  }

  .cm-variable-valid{color: green}
  .cm-variable-invalid{color: red}
`;

export default StyledWrapper;
