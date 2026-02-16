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
    background: transparent;
    border: none;
    color: ${(props) => props.theme.colors.text.muted};
    cursor: pointer;
    padding: 6px;
    opacity: 0.7;
    transition: all 0.2s ease;

    &:hover {
      opacity: 1;
      color: ${(props) => props.theme.text};
    }

    &:active {
      transform: translateY(1px);
    }
  }
`;

export default StyledWrapper;
