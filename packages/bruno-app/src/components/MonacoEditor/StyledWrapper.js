import styled from 'styled-components';

const StyledWrapper = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;

  .monaco-editor-container {
    flex: 1 1 0;
    min-height: 0;
    border: solid 1px ${(props) => props.theme.codemirror.border};
    background: ${(props) => props.theme.codemirror.bg};
  }

  /* Flush line numbers to the left edge like CodeMirror */
  .monaco-editor .margin-view-overlays .line-numbers {
    text-align: left !important;
    padding-left: 3px !important;
  }

  /* Bruno variable highlighting decorations */
  .bruno-variable-valid {
    color: ${(props) => props.theme.codemirror.variable.valid} !important;
    font-weight: 500;
  }

  .bruno-variable-invalid {
    color: ${(props) => props.theme.codemirror.variable.invalid} !important;
    font-weight: 500;
    text-decoration: wavy underline ${(props) => props.theme.codemirror.variable.invalid};
    text-underline-offset: 3px;
  }

  .bruno-variable-prompt {
    color: ${(props) => props.theme.codemirror.variable.prompt} !important;
    font-weight: 500;
  }
`;

export default StyledWrapper;
