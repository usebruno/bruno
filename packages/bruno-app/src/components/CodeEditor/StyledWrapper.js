import styled from 'styled-components';

const StyledWrapper = styled.div`
  div.CodeMirror {
    background: ${(props) => props.theme.codemirror.bg};
    border: solid 1px ${(props) => props.theme.codemirror.border};
    font-family: ${(props) => (props.font ? props.font : 'default')};
    font-size: ${(props) => (props.fontSize ? `${props.fontSize}px` : 'inherit')};
    line-break: anywhere;
    flex: 1 1 0;
    display: flex;
    flex-direction: column-reverse;
  }

  /* Removes the glow outline around the folded JSON */
  .CodeMirror-foldmarker {
    text-shadow: none;
    color: ${(props) => props.theme.textLink};
    background: none;
    padding: 0;
    margin: 0;
  }

  .CodeMirror-overlayscroll-horizontal div,
  .CodeMirror-overlayscroll-vertical div {
    background: #d2d7db;
  }

  .CodeMirror-dialog {
    overflow: visible;
    position: relative;
    top: unset;
    left: unset;

    input {
      background: transparent;
      border: 1px solid #d3d6db;
      outline: none;
      border-radius: 0px;
    }
  }

  #search-results-count {
    display: inline-block;
    position: absolute;
    top: calc(100% + 1px);
    right: 0;
    border-width: 0 0 1px 1px;
    border-style: solid;
    border-color: ${(props) => props.theme.codemirror.border};
    padding: 0.1em 0.8em;
    background-color: ${(props) => props.theme.codemirror.bg};
    color: rgb(102, 102, 102);
    white-space: nowrap;
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

  /* === Monokai syntax colors === */
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

  /* === Default theme syntax colors (from theme) === */
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

  /* === Matching bracket highlight === */
  .CodeMirror-matchingbracket {
    background: ${(props) => props.theme.codemirror.syntax?.matchingBracketBg || '#5cc0b48c'} !important;
    text-decoration: unset;
  }
`;

export default StyledWrapper;
