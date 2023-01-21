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
      border-left: 1px solid ${(props) => props.theme.text} !important;
    }

    pre {
      font-family: Inter, sans-serif !important;
      font-weight: 400;
    }

    .CodeMirror-line {
      color: ${(props) => props.theme.text};
    }
  }
  
`;

export default StyledWrapper;
