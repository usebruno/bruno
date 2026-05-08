import styled from 'styled-components';

/** Outer row for editor + secret toggle; flex min sizes avoid scroll jitter in env tables (#7229). */
export const EditorRoot = styled.div`
  display: flex;
  flex-flow: row nowrap;
  align-items: flex-start;
  justify-content: space-between;
  width: 100%;
  min-height: 0;
  min-width: 0;
  overflow-x: auto;
`;

const StyledWrapper = styled.div`
  width: 100%;
  height: fit-content;
  max-height: 200px;
  align-self: flex-start;
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

  /* codemirror.css sets .CodeMirror { height: 300px } and .CodeMirror-scroll { height: 100% }.
     The percentage chain lets the editor absorb a tall table cell; force content-sized height. */
  .CodeMirror {
    background: transparent;
    height: auto !important;
    font-size: ${(props) => props.theme.font.size.base};
    line-height: 30px;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    justify-content: flex-start;
    flex-wrap: nowrap;
    max-height: 200px;

    .CodeMirror-scroll {
      flex: 0 0 auto;
      align-self: stretch;
      min-height: 0;
      height: auto !important;
      max-height: 200px;
    }

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
