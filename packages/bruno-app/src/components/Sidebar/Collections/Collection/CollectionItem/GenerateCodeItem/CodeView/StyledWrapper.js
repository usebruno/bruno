import styled from 'styled-components';

const StyledWrapper = styled.div`
  height: 100%;
  position: relative;

  .editor-content {
    height: 100%;

    .CodeMirror {
      height: 100%;
      font-size: ${(props) => props.theme.font.size.sm};
      background: ${(props) => props.theme.modal.bg};
      line-height: 1.5;
      padding: 0;
      background: transparent !important;
      border: none;

      .CodeMirror-gutters {
        background: transparent !important;
        border-right: none;
      }

      .CodeMirror-linenumber {
        color: ${(props) => props.theme.colors.text.muted};
        font-size: ${(props) => props.theme.font.size.xs};
        padding: 0 3px 0 5px;
      }

      .CodeMirror-lines {
        padding: 0;
      }

      .CodeMirror-line {
        padding: 0 4px;
      }
    }
  }

  .copy-to-clipboard {
    position: absolute;
    top: 10px;
    right: 10px;
    z-index: 10;
    display: flex;
    align-items: center;
    justify-content: center;
    background: ${(props) => props.theme.modal.body.bg};
    border: 1px solid ${(props) => props.theme.border.border1};
    border-radius: ${(props) => props.theme.border.radius.sm};
    color: ${(props) => props.theme.colors.text.muted};
    cursor: pointer;
    padding: 4px;
    /* Hidden with opacity (not visibility/display) so it stays in the tab order for keyboard users. */
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.15s ease, color 0.15s ease, border-color 0.15s ease;

    &:hover {
      color: ${(props) => props.theme.text};
      border-color: ${(props) => props.theme.border.border2};
    }

    &:active {
      transform: translateY(1px);
    }
  }

  /* Only reveal the copy button while the code block is hovered (or the button / editor has keyboard focus),
     so it never permanently covers the snippet. */
  &:hover .copy-to-clipboard,
  &:focus-within .copy-to-clipboard {
    opacity: 1;
    pointer-events: auto;
  }
`;

export default StyledWrapper;
