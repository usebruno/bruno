import { createGlobalStyle } from 'styled-components';

const GlobalStyle = createGlobalStyle`
  .CodeMirror-gutters {
    background-color: ${(props) => props.theme.codemirror.gutter.bg} !important;
    border-right: solid 1px ${(props) => props.theme.codemirror.border};
  }

  .text-link {
    color: ${(props) => props.theme.textLink};
  }
  .text-muted {
    color: ${(props) => props.theme.colors.text.muted};
  }

  .btn {
    text-align: center;
    white-space: nowrap;
    outline: none;
    box-shadow: none;
    border-radius: 3px;
  }

  .btn-sm {
    padding: .215rem .6rem .215rem .6rem;
  }

  .btn-xs {
    padding: .2rem .4rem .2rem .4rem;
  }

  .btn-md {
    padding: .4rem 1.1rem;
    line-height: 1.47;
  }

  .btn-default {
    &:active,
    &:hover,
    &:focus {
      outline: none;
      box-shadow: none;
    }
  }

  .btn-close {
    color: ${(props) => props.theme.button.close.color};
    background: ${(props) => props.theme.button.close.bg};
    border: solid 1px ${(props) => props.theme.button.close.border};

    &.btn-border {
      border: solid 1px #696969;
    }

    &:hover,
    &:focus {
      outline: none;
      box-shadow: none;
      border: solid 1px #696969;
    }
  }

  .btn-danger {
    color: ${(props) => props.theme.button.danger.color};
    background: ${(props) => props.theme.button.danger.bg};
    border: solid 1px ${(props) => props.theme.button.danger.border};

    &:hover,
    &:focus {
      outline: none;
      box-shadow: none;
    }
  }

  .btn-secondary {
    color: ${(props) => props.theme.button.secondary.color};
    background: ${(props) => props.theme.button.secondary.bg};
    border: solid 1px ${(props) => props.theme.button.secondary.border};

    .btn-icon {
      color: #3f3f3f;
    }

    &:hover,
    &:focus {
      border-color: ${(props) => props.theme.button.secondary.hoverBorder};
      outline: none;
      box-shadow: none;
    }

    &:disabled {
      color: ${(props) => props.theme.button.disabled.color};
      background: ${(props) => props.theme.button.disabled.bg};
      border: solid 1px ${(props) => props.theme.button.disabled.border};
      cursor: not-allowed;
    }

    &:disabled.btn-icon {
      color: #545454;
    }
  }

  input::placeholder {
    color: ${(props) => props.theme.input.placeholder.color};
    opacity:  ${(props) => props.theme.input.placeholder.opacity};
  }

  @keyframes fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes fade-out {
    from {
     opacity: 1;
    }
    to {
      opacity: 0;
    }
  }

  @keyframes fade-and-slide-in-from-top {
    from {
      opacity: 0;
      -webkit-transform: translateY(-30px);
              transform: translateY(-30px);
    }
    to {
      opacity: 1;
      -webkit-transform: none;
              transform: none;
    }
  }

  @keyframes fade-and-slide-out-from-top {
    from {
      opacity: 1;
      -webkit-transform: none;
              transform: none;
    }
    to {
      opacity: 2;
      -webkit-transform: translateY(-30px);
              transform: translateY(-30px);
    }
  }

  @keyframes rotateClockwise {
    0% {
      transform: scaleY(-1) rotate(0deg);
    }
    100% {
      transform: scaleY(-1) rotate(360deg);
    }
  }

  @keyframes rotateCounterClockwise {
    0% {
      transform: scaleY(-1) rotate(360deg);
    }
    100% {
      transform: scaleY(-1) rotate(0deg);
    }
  }


  // scrollbar styling
  // the below media query target non-macos devices
  // (macos scrollbar styling is the ideal style reference)
  @media not all and (pointer: coarse) {
    * {
      scrollbar-color: ${(props) => props.theme.scrollbar.color};
    }
    
    *::-webkit-scrollbar {
      width: 5px;
    }
    
    *::-webkit-scrollbar-track {
      background: transparent;
      border-radius: 5px;
    }
    
    *::-webkit-scrollbar-thumb {
      background-color: ${(props) => props.theme.scrollbar.color};
      border-radius: 14px;
      border: 3px solid ${(props) => props.theme.scrollbar.color};
    }
  }

  // Utility class for scrollbars that are hidden by default and shown on hover
  .scrollbar-hover {
    scrollbar-width: thin;
    scrollbar-color: transparent transparent;

    &::-webkit-scrollbar {
      width: 5px;
    }

    &::-webkit-scrollbar-track {
      background: transparent;
      border-radius: 5px;
    }

    &::-webkit-scrollbar-thumb {
      background-color: transparent;
      border-radius: 14px;
      border: 3px solid transparent;
      background-clip: content-box;
      transition: background-color 0.2s ease;
    }

    &:hover {
      scrollbar-color: ${(props) => props.theme.scrollbar.color} transparent;
      
      &::-webkit-scrollbar-thumb {
        background-color: ${(props) => props.theme.scrollbar.color};
      }
    }

    &::-webkit-scrollbar-thumb:hover {
      background-color: ${(props) => props.theme.scrollbar.color};
      opacity: 0.8;
    }
  }


  // codemirror
  .CodeMirror {
    .cm-variable-valid {
      color: ${(props) => props.theme.codemirror.variable.valid};
    }
    .cm-variable-invalid {
      color: ${(props) => props.theme.codemirror.variable.invalid};
    }
  }
  .CodeMirror-brunoVarInfo {
    color: ${(props) => props.theme.codemirror.variable.info.color};
    background: ${(props) => props.theme.codemirror.variable.info.bg};
    border-radius: 6px;
    box-shadow: ${(props) => props.theme.codemirror.variable.info.boxShadow};
    box-sizing: border-box;
    font-size: 14px;
    line-height: 16px;
    margin: 8px -8px;
    margin-left: 2px;
    max-width: 400px;
    min-width: 291px;
    opacity: 0;
    overflow: hidden;
    padding: 8px;
    position: fixed;
    transition: opacity 0.15s;
    z-index: 50;
    border: 1px solid ${(props) => props.theme.codemirror.variable.info.border || 'rgba(0,0,0,0.1)'};
  }

  .CodeMirror-brunoVarInfo .bruno-var-info-container {
    width: 100%;
  }

  .CodeMirror-brunoVarInfo .info-name {
    font-size: 14px;
    margin-bottom: 6px;
    color: ${(props) => props.theme.colors.text.yellow};
    opacity: 1;
    padding: 2px 6px;
    background: ${(props) => props.theme.codemirror.variable.info.nameBackground};
    border-radius: 4px;
    display: inline-block;
  }

  .CodeMirror-brunoVarInfo .value-container {
    display: flex;
    flex-direction: column;
    gap: 8px;
    position: relative;
    width: 100%;
  }

  .CodeMirror-brunoVarInfo .value-container .copy-button {
    position: absolute;
    top: 6px;
    right: 6px;
    z-index: 1;
    background: transparent;
    color: #989898;
  }

  .CodeMirror-brunoVarInfo .info-description {
    word-break: break-all;
    max-height: 120px;
    overflow-y: auto;
    padding: 6px;
    background: rgba(0, 0, 0, 0.02);
    border-radius: 3px;
    border: 1px solid rgba(0, 0, 0, 0.05);
    font-family: monospace;
  }

  .CodeMirror-brunoVarInfo .edit-textarea {
    font-family: monospace;
    font-size: 13px;
    line-height: 16px;
    background: ${(props) => props.theme.codemirror.variable.info.textareaBackground};
    color: ${(props) => props.theme.codemirror.variable.info.textareaColor};
    border: 1px solid ${(props) => props.theme.codemirror.border || '#ccc'};
    padding: 8px 28px 8px 8px;
    border-radius: 6px;
    width: 275px;
    min-height: 24px;
    max-height: 137px;
    resize: none;
    overflow-y: auto;
    white-space: pre-wrap;
    word-wrap: break-word;
    word-break: break-all;
    overflow-wrap: anywhere;
    box-sizing: border-box;
  }

  .CodeMirror-brunoVarInfo .edit-textarea:focus {
    outline: none;
    border-color: ${(props) => props.theme.codemirror.variable.info.textareaFocusBorder};
    box-shadow: ${(props) => props.theme.codemirror.variable.info.textareaFocusShadow};
  }

  .CodeMirror-brunoVarInfo .read-only-textarea {
    cursor: default;
    user-select: text;
  }

  .CodeMirror-brunoVarInfo .read-only-textarea:focus {
    outline: none;
    border-color: ${(props) => props.theme.codemirror.border || '#ccc'};
    box-shadow: none;
  }


  .CodeMirror-brunoVarInfo .read-only-info {
    font-size: 11px;
    color: #666;
    margin-top: 4px;
    font-style: italic;
  }

  .CodeMirror-brunoVarInfo :first-child {
    margin-top: 0;
  }

  .CodeMirror-brunoVarInfo :last-child {
    margin-bottom: 0;
  }

  .CodeMirror-brunoVarInfo p {
    margin: 1em 0;
  }

  .CodeMirror-hint-active {
    background: #08f !important;
    color: #fff !important;
  }
`;

export default GlobalStyle;
