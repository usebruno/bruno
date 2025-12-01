import styled from 'styled-components';

const StyledWrapper = styled.div`
  &.read-only {
    div.CodeMirror .CodeMirror-cursor {
      display: none !important;
    }
  }

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

  .CodeMirror-placeholder {
    color: ${(props) => props.theme.text} !important;
    opacity: 0.5 !important;
  }

  .CodeMirror-linenumber {
    text-align: left !important;
    padding-left: 3px !important;
  }

  /* Override default lint highlight background when emphasizing the gutter */
  .CodeMirror-lint-line-error,
  .CodeMirror-lint-line-warning {
    background: none !important;
  }

  /* Style line numbers when there's a lint issue */
  .CodeMirror-lint-line-error .CodeMirror-linenumber {
    color: #d32f2f !important;
    text-decoration: underline;
  }

  .CodeMirror-lint-line-warning .CodeMirror-linenumber {
    color: #f57c00 !important;
    text-decoration: underline;
  }

  /* Removes the glow outline around the folded json */
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

  // Todo: dark mode temporary fix
  // Clean this
  .CodeMirror.cm-s-monokai {
    .CodeMirror-overlayscroll-horizontal div,
    .CodeMirror-overlayscroll-vertical div {
      background: #444444;
    }
  }

  .cm-s-default, .cm-s-monokai {
    span.cm-def {
      color: ${(props) => props.theme.codemirror.tokens.definition} !important;
    }
    span.cm-property {
      color: ${(props) => props.theme.codemirror.tokens.property} !important;
    }
    span.cm-string {
      color: ${(props) => props.theme.codemirror.tokens.string} !important;
    }
    span.cm-number {
      color: ${(props) => props.theme.codemirror.tokens.number} !important;
    }
    span.cm-atom {
      color: ${(props) => props.theme.codemirror.tokens.atom} !important;
    }
    span.cm-variable {
      color: ${(props) => props.theme.codemirror.tokens.variable} !important;
    }
    span.cm-keyword {
      color: ${(props) => props.theme.codemirror.tokens.keyword} !important;
    }
    span.cm-comment {
      color: ${(props) => props.theme.codemirror.tokens.comment} !important;
    }
    span.cm-operator {
      color: ${(props) => props.theme.codemirror.tokens.operator} !important;
    }
  }

  /* Variable validation colors */
  .cm-variable-valid {
    color: #5fad89 !important; /* Soft sage */
  }
  .cm-variable-invalid {
    color: #d17b7b !important; /* Soft coral */
  }

  .CodeMirror-search-hint {
    display: inline;
  }
  
  
  //matching bracket fix
  .CodeMirror-matchingbracket {
    background: #5cc0b48c !important;
    text-decoration:unset;
  }

  .cm-search-line-highlight {
    background: ${(props) => props.theme.codemirror.searchLineHighlightCurrent};
  }

  .cm-search-match {
    background: rgba(255, 193, 7, 0.25);
  }

  .cm-search-current {
    background: rgba(255, 193, 7, 0.4);
  }

  .lint-error-tooltip {
    position: fixed;
    z-index: 10000;
    background: ${(props) => props.theme.codemirror.bg};
    border-radius: ${(props) => props.theme.border.radius.base};
    padding: 8px 12px;
    max-width: 400px;
    box-shadow: ${(props) => props.theme.shadow.sm};
    font-size: ${(props) => props.theme.font.size.xs};
    line-height: 1.5;
    pointer-events: none;

    .lint-tooltip-message {
      padding: 2px 0;
    }

    .lint-tooltip-message.error {
      color: ${(props) => props.theme.colors.text.danger};
    }

    .lint-tooltip-message.warning {
      color: ${(props) => props.theme.colors.text.warning};
    }
  }
`;

export default StyledWrapper;
