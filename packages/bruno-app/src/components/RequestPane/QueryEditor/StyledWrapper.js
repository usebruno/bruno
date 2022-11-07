import styled from 'styled-components';

const StyledWrapper = styled.div`
  div.CodeMirror {
    background: ${(props) => props.theme.codemirror.bg};
    border: solid 1px ${(props) => props.theme.codemirror.border};
    /* todo: find a better way */
    height: calc(100vh - 220px);
  }

  textarea.cm-editor {
    position: relative;
  }

  // Todo: dark mode temporary fix
  // Clean this
  .cm-s-monokai span.cm-property, .cm-s-monokai span.cm-attribute {
    color: #9cdcfe !important;
  }

  .cm-s-monokai span.cm-string {
    color: #ce9178 !important;
  }

  .cm-s-monokai span.cm-number{
    color: #b5cea8 !important;
  }

  .cm-s-monokai span.cm-atom{
    color: #569cd6 !important;
  }
`;

export default StyledWrapper;
