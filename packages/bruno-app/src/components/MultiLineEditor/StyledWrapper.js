import styled from 'styled-components';

const StyledWrapper = styled.div`
  width: 100%;
  height: fit-content;
  max-height: 200px;
  overflow: auto;

  &.read-only {
    .CodeMirror .CodeMirror-lines {
      cursor: not-allowed !important;
      user-select: none !important;
      -webkit-user-select: none !important;
      -ms-user-select: none !important;
    }

    .CodeMirror-line {
      color: ${(props) => props.theme.colors.text.muted} !important;
    }
  }

  .CodeMirror {
    background: transparent;
    height: fit-content;
    font-size: 14px;
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
`;

export default StyledWrapper;
