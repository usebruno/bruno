import styled from 'styled-components';

const StyledWrapper = styled.div`
  width: 100%;
  height: fit-content;
  max-height: 200px;
  overflow: auto;

  &.read-only {
    .CodeMirror .CodeMirror-lines {
      cursor: not-allowed !important;
    }

    .CodeMirror-cursor {
      display: none !important;
    }
  }

  .CodeMirror {
    background: transparent;
    height: fit-content;
    font-size: ${(props) => props.theme.font.size.base};
    line-height: 30px;
    display: flex;
    flex-direction: column;
    max-height: 200px;

    pre.CodeMirror-placeholder {
      color: ${(props) => props.theme.codemirror.placeholder.color} !important;
      opacity: ${(props) => props.theme.codemirror.placeholder.opacity} !important;
      padding-left: 0;
    }

    .CodeMirror-vscrollbar,
    .CodeMirror-hscrollbar,
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
      padding: 0;
    }

    .CodeMirror-selected {
      background-color: rgba(212, 125, 59, 0.3);
    }
  }

  .cm-s-default,
  .cm-s-monokai {
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
    span.cm-variable,
    span.cm-variable-2 {
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
    span.cm-tag {
      color: ${(props) => props.theme.codemirror.tokens.tag} !important;
    }
    span.cm-tag.cm-bracket {
      color: ${(props) => props.theme.codemirror.tokens.tagBracket} !important;
    }
  }

  .cm-variable-valid {
    color: ${(props) => props.theme.codemirror.variable.valid} !important;
  }
  .cm-variable-invalid {
    color: ${(props) => props.theme.codemirror.variable.invalid} !important;
  }
  .cm-variable-prompt {
    color: ${(props) => props.theme.codemirror.variable.prompt} !important;
  }
`;

export default StyledWrapper;
