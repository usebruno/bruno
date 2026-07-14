import styled from 'styled-components';

const StyledWrapper = styled.div`
  width: 100%;
  min-height: ${(props) => (props.$isCompact ? '1.375rem' : '1.875rem')};
  overflow: hidden;

  &.read-only {
    .CodeMirror-cursor {
      display: none !important;
    }
  }

  .CodeMirror {
    background: transparent;
    height: auto;
    width: 100%;
    min-height: ${(props) => (props.$isCompact ? '1.375rem' : '2.125rem')};
    font-size: ${(props) => props.theme.font.size.base};
    line-height: ${(props) => (props.$isCompact ? '1.375rem' : '1.5rem')};
    overflow: hidden;
    ${(props) => props.$lineWrapping ? 'min-height: 0 !important;' : ''}

    .CodeMirror-scroll {
      overflow: hidden !important;
      padding-bottom: 0 !important;
      height: auto !important;
      min-height: 0 !important;
      width: 100% !important;
    }

    .CodeMirror-sizer {
      min-height: 0 !important;
      margin-bottom: 0 !important;
      width: 100% !important;
      box-sizing: border-box !important;
    }

    .CodeMirror-vscrollbar,
    .CodeMirror-hscrollbar,
    .CodeMirror-scrollbar-filler {
      display: none;
    }

    .CodeMirror-lines {
      padding: ${(props) => props.$lineWrapping ? '0.15rem 0' : '0.25rem 0'};
      word-break: ${(props) => props.$lineWrapping ? 'break-all' : 'normal'};

      .CodeMirror-placeholder {
        color: ${(props) => props.theme.codemirror.placeholder.color} !important;
        opacity:  ${(props) => props.theme.codemirror.placeholder.opacity} !important
      }
    }

    .CodeMirror-cursor {
      height: ${(props) => (props.$isCompact ? '0.875rem' : '1.125rem')} !important;
      margin-top: ${(props) => (props.$isCompact ? '0.25rem' : '0.1875rem')} !important;
      border-left: 1px solid ${(props) => props.theme.text} !important;
    }

    pre {
      font-family: Inter, sans-serif !important;
      font-weight: 400;
    }

    .CodeMirror-line {
      color: ${(props) => props.theme.text};
      padding: 0;
      word-break: ${(props) => props.$lineWrapping ? 'break-all' : 'normal'};
    }

    .CodeMirror-selected {
      background-color: rgba(212, 125, 59, 0.3);
    }
  }
`;

export default StyledWrapper;
