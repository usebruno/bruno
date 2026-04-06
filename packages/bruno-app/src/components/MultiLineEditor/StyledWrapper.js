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

    .CodeMirror-line {
      color: ${(props) => props.theme.colors.text.muted} !important;
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
      color: ${(props) => props.theme.text};
      padding-left: 0;
      opacity: 0.5;
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

  /* Deferred viewer — exactly matches .CodeMirror + .CodeMirror-line + pre styles */
  .viewer-content {
    background: transparent;
    height: fit-content;
    min-height: 30px;
    max-height: 200px;
    font-family: Inter, sans-serif !important;
    font-weight: 400;
    font-size: ${(props) => props.theme.font.size.base};
    line-height: 30px;
    padding: 0;
    overflow: hidden;
    color: ${(props) => props.theme.text};
    white-space: pre-wrap;
    word-break: break-word;
  }

  &.read-only .viewer-content {
    color: ${(props) => props.theme.colors.text.muted};
    cursor: not-allowed;
  }

  .viewer-content .viewer-placeholder {
    color: ${(props) => props.theme.text};
    opacity: 0.5;
    padding-left: 0;
  }

  .viewer-content .variable-valid {
    color: ${(props) => props.theme.codemirror.variable.valid};
  }

  .viewer-content .variable-invalid {
    color: ${(props) => props.theme.codemirror.variable.invalid};
  }
`;

export default StyledWrapper;
