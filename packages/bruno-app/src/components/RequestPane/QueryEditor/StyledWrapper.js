import styled from 'styled-components';

const StyledWrapper = styled.div`
  div.CodeMirror {
    background: ${(props) => props.theme.codemirror.bg};
    border: solid 1px ${(props) => props.theme.codemirror.border};
    font-family: ${(props) => (props.font ? props.font : 'default')};
    font-size: ${(props) => (props.fontSize ? `${props.fontSize}px` : 'inherit')};
    flex: 1 1 0;
  }

  textarea.cm-editor {
    position: relative;
  }

  /* === Dark mode (Monokai) legacy fix === */
  .CodeMirror.cm-s-monokai {
    .CodeMirror-overlayscroll-horizontal div,
    .CodeMirror-overlayscroll-vertical div {
      background: #444444;
    }
  }

  /* === Monokai syntax colors (kept as-is for legacy) === */
  .cm-s-monokai span.cm-property,
  .cm-s-monokai span.cm-attribute {
    color: #9cdcfe !important;
  }

  .cm-s-monokai span.cm-string {
    color: #ce9178 !important;
  }

  .cm-s-monokai span.cm-number {
    color: #b5cea8 !important;
  }

  .cm-s-monokai span.cm-atom {
    color: #569cd6 !important;
  }

  /* === Default theme syntax colors now driven by theme === */
  .cm-s-default span.cm-property {
    color: ${(props) => props.theme.codemirror.syntax?.property || '#1f61a0'} !important;
  }

  .cm-s-default span.cm-string {
    color: ${(props) => props.theme.codemirror.syntax?.string || '#ce9178'} !important;
  }

  .cm-s-default span.cm-number {
    color: ${(props) => props.theme.codemirror.syntax?.number || '#b5cea8'} !important;
  }

  .cm-s-default span.cm-atom {
    color: ${(props) => props.theme.codemirror.syntax?.boolean || '#569cd6'} !important;
  }

  .cm-variable-valid {
    color: ${(props) => props.theme.codemirror.variable?.valid || 'green'};
  }

  .cm-variable-invalid {
    color: ${(props) => props.theme.codemirror.variable?.invalid || 'red'};
  }

  .CodeMirror-search-hint {
    display: inline;
  }
`;

export default StyledWrapper;
