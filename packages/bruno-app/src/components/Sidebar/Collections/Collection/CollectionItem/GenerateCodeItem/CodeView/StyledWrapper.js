import styled from 'styled-components';

const StyledWrapper = styled.div`
  height: 100%;
  position: relative;

  .editor-content {
    height: 100%;

    .CodeMirror {
      height: 100%;
      font-size: 12px;
      line-height: 1.5;
      padding: 0;

      .CodeMirror-gutters {
        background: ${props => props.theme.codemirror.gutter.bg};
        border-right: 1px solid ${props => props.theme.codemirror.border};
      }

      .CodeMirror-linenumber {
        color: ${props => props.theme.colors.text.muted};
        font-size: 11px;
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
    color: ${props => props.theme.colors.text.muted};
    cursor: pointer;
    padding: 6px;
    opacity: 0.7;
    transition: all 0.2s ease;

    &:hover {
      opacity: 1;
      color: ${props => props.theme.text};
    }

    &:active {
      transform: translateY(1px);
    }
  }
`;

export default StyledWrapper;
