import styled, { css } from 'styled-components';

const maxHeight = (props) => props.$maxHeight || '200px';

const foldEditorStyles = css`
  line-height: 1.5;

  .CodeMirror {
    line-height: 1.5 !important;
  }

  .CodeMirror-lines {
    padding: 4px 0;
  }

  .CodeMirror-line {
    line-height: 1.5 !important;
    padding: 0 4px 0 0 !important;
  }

  .CodeMirror-gutters {
    background: transparent;
    border: none;
  }

  .CodeMirror-linenumber {
    text-align: left !important;
    padding-left: 3px !important;
    padding-right: 4px !important;
    color: ${(props) => props.theme.colors.text.muted};
    font-size: 12px;
    line-height: 1.5 !important;
  }

  .CodeMirror-foldgutter {
    width: 14px;
  }

  .CodeMirror-foldgutter-open,
  .CodeMirror-foldgutter-folded {
    cursor: pointer;
    color: ${(props) => props.theme.colors.text.muted};
    font-size: 12px;
    line-height: 1.5 !important;
  }

  .CodeMirror-foldmarker {
    text-shadow: none;
    color: ${(props) => props.theme.textLink};
    background: none;
    border: none;
    padding: 0;
    margin: 0;
  }
`;

/* Grows with its content up to $maxHeight, then CodeMirror owns the scroll. */
const autoHeightStyles = css`
  height: auto !important;
  max-height: ${maxHeight} !important;
  overflow: hidden !important;

  .CodeMirror {
    height: auto !important;
    max-height: ${maxHeight} !important;
  }

  .CodeMirror-scroll {
    height: auto !important;
    max-height: ${maxHeight} !important;
    overflow: auto !important;
    ${(props) => (props.$containOverscroll ? 'overscroll-behavior: contain;' : '')}
  }
`;

const StyledWrapper = styled.div`
  width: 100%;
  height: fit-content;
  max-height: ${maxHeight};
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
    line-height: ${(props) => (props.$enableFolding ? '1.5' : '30px')};
    display: flex;
    flex-direction: column;
    max-height: ${maxHeight};

    pre.CodeMirror-placeholder {
      color: ${(props) => props.theme.codemirror.placeholder.color} !important;
      opacity: ${(props) => props.theme.codemirror.placeholder.opacity} !important;
      padding-left: 0;
    }

    /* An $autoHeight editor scrolls internally, so it keeps its scrollbars. */
    ${(props) => !props.$autoHeight && css`
      .CodeMirror-vscrollbar,
      .CodeMirror-hscrollbar,
      .CodeMirror-scrollbar-filler {
        display: none !important;
      }
    `}

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

  ${(props) => props.$enableFolding && foldEditorStyles}
  ${(props) => props.$autoHeight && autoHeightStyles}
`;

export default StyledWrapper;
