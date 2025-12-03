import { createGlobalStyle } from 'styled-components';

const GlobalStyle = createGlobalStyle`

  body {
    font-size: ${(props) => props.theme.font.size.base};
  }

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
    .cm-variable-prompt {
      color: ${(props) => props.theme.codemirror.variable.prompt};
    }
  }
  .CodeMirror-brunoVarInfo {
    color: ${(props) => props.theme.codemirror.variable.info.color};
    background: ${(props) => props.theme.codemirror.variable.info.bg};
    border: 0.0625rem solid ${(props) => props.theme.codemirror.variable.info.border};
    border-radius: 0.375rem;
    box-shadow: ${(props) => props.theme.codemirror.variable.info.boxShadow};
    box-sizing: border-box;
    font-size: ${(props) => props.theme.font.size.base};
    line-height: 1.25rem;
    margin: 0;
    min-width: 18.1875rem;
    max-width: 18.1875rem;
    opacity: 0;
    overflow: visible;
    padding: 0.5rem;
    position: fixed;
    transition: opacity 0.15s;
    z-index: 10;
  }

  .CodeMirror-hints {
    z-index: 50 !important;
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

  /* Header */
  .CodeMirror-brunoVarInfo .var-info-header {
    display: flex;
    align-items: center;
    margin-bottom: 0.375rem;
    gap: 0.375rem;
  }

  .CodeMirror-brunoVarInfo .var-name {
    font-size: ${(props) => props.theme.font.size.base};
    color: ${(props) => props.theme.codemirror.variable.info.color};
    font-weight: 500;
  }

  /* Scope Badge */
  .CodeMirror-brunoVarInfo .var-scope-badge {
    display: inline-block;
    padding: 0.125rem 0.375rem;
    background: #D977061A;
    border-radius: 0.25rem;
    font-size: ${(props) => props.theme.font.size.sm};
    color: #D97706;
    letter-spacing: 0.03125rem;
  }

  /* Value Container */
  .CodeMirror-brunoVarInfo .var-value-container {
    position: relative;
    border: 0.0625rem solid ${(props) => props.theme.codemirror.variable.info.editorBorder};
    border-radius: 0.375rem;
    background: ${(props) => props.theme.codemirror.variable.info.editorBg};
    overflow-y: auto;
    overflow-x: hidden;
    min-width: 17.3125rem;
    max-height: 13.1875rem;
  }

  /* Value Display (Read-only) */
  .CodeMirror-brunoVarInfo .var-value-display {
    padding: 0.375rem 1.5rem 0.375rem 0.5rem;
    font-size: ${(props) => props.theme.font.size.base};
    font-family: Inter, sans-serif;
    font-weight: 400;
    word-break: break-word;
    line-height: 1.25rem;
    color: ${(props) => props.theme.codemirror.variable.info.color};
    min-height: 1.75rem;
    max-width: 13.1875rem;
  }

  /* Value Editor (CodeMirror) */
  .CodeMirror-brunoVarInfo .var-value-editor {
    width: 100%;
    min-width: 17.1875rem;
    max-width: 17.1875rem;
    max-height: 11.125rem;
    position: relative;
  }

  .CodeMirror-brunoVarInfo .var-value-editor .CodeMirror {
    height: 100%;
    min-height: 1.75rem;
    max-height: 11.125rem;
    font-size: ${(props) => props.theme.font.size.base};
    font-family: Inter, sans-serif;
    font-weight: 400;
    line-height: 1.25rem;
    border: 0.0625rem solid ${(props) => props.theme.codemirror.variable.info.editorBorder};
    border-radius: 0.375rem;
    background: ${(props) => props.theme.codemirror.variable.info.editorBg};
    color: ${(props) => props.theme.codemirror.variable.info.color};
    transition: border-color 0.15s;
  }

  .CodeMirror-brunoVarInfo .var-value-editor .CodeMirror-scroll {
    min-height: 1.75rem;
    max-height: 11.125rem;
    overflow-y: auto !important;
    overflow-x: hidden !important;
  }

  .CodeMirror-brunoVarInfo .var-value-editor .CodeMirror-focused {
    background: ${(props) => props.theme.codemirror.variable.info.editorBg};
    border-color: ${(props) => props.theme.codemirror.variable.info.editorFocusBorder};
  }

  .CodeMirror-brunoVarInfo .var-value-editor .CodeMirror-lines {
    padding: 0.375rem 1.5rem 0.375rem 0.5rem;
    max-width: 13.1875rem;
    font-family: Inter, sans-serif;
    font-weight: 400;
    line-height: 1.25rem;
    word-break: break-all;
    word-wrap: break-word;
    overflow-wrap: break-word;
  }

  .CodeMirror-brunoVarInfo .var-value-editor .CodeMirror pre {
    font-size: ${(props) => props.theme.font.size.base};
    font-family: Inter, sans-serif;
    font-weight: 400;
    line-height: 1.25rem;
    word-break: break-all;
    word-wrap: break-word;
    overflow-wrap: break-word;
    white-space: pre-wrap;
    color: ${(props) => props.theme.codemirror.variable.info.color};
  }

  .CodeMirror-brunoVarInfo .var-value-editor .CodeMirror-line {
    padding: 0;
    max-width: 13.1875rem;
    line-height: 1.25rem;
    font-size: ${(props) => props.theme.font.size.base};
    font-family: Inter, sans-serif;
    font-weight: 400;
    word-break: break-all;
    word-wrap: break-word;
    overflow-wrap: break-word;
    color: ${(props) => props.theme.codemirror.variable.info.color};
  }

  .CodeMirror-brunoVarInfo .var-value-editor .CodeMirror-sizer {
    margin-left: 0 !important;
    margin-bottom: 0 !important;
    max-width: 13.1875rem !important;
  }

  /* Editable value display (shows interpolated value, click to edit) */
  .CodeMirror-brunoVarInfo .var-value-editable-display {
    width: 17.1875rem;
    max-width: 13.1875rem;
    padding: 0.375rem 1.5rem 0.375rem 0.5rem;
    font-size: ${(props) => props.theme.font.size.base};
    font-family: Inter, sans-serif;
    font-weight: 400;
    word-break: break-all;
    word-wrap: break-word;
    overflow-wrap: break-word;
    white-space: pre-wrap;
    line-height: 1.25rem;
    color: ${(props) => props.theme.codemirror.variable.info.color};
    min-height: 1.75rem;
    cursor: text;
    border-radius: 0.375rem;
  }

  /* Icons Container */
  .CodeMirror-brunoVarInfo .var-icons {
    position: absolute;
    top: 0.375rem;
    right: 0.5rem;
    display: flex;
    gap: 0.25rem;
    z-index: 10;
  }

  .CodeMirror-brunoVarInfo .secret-toggle-button,
  .CodeMirror-brunoVarInfo .copy-button {
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 0.125rem;
    opacity: 1;
    transition: opacity 0.2s;
    color: ${(props) => props.theme.codemirror.variable.info.iconColor};
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .CodeMirror-brunoVarInfo .secret-toggle-button:hover,
  .CodeMirror-brunoVarInfo .copy-button:hover {
    opacity: 0.7;
  }

  .CodeMirror-brunoVarInfo .copy-success {
    color: #22c55e !important;
  }

  /* Read-only Note */
  .CodeMirror-brunoVarInfo .var-readonly-note {
    font-size: ${(props) => props.theme.font.size.xs};
    color: ${(props) => props.theme.colors.text.muted};
    opacity: 0.6;
    margin-top: 0.25rem;
  }

  .CodeMirror-brunoVarInfo .var-warning-note {
    font-size: 0.75rem;
    color: #ef4444;
    margin-top: 0.375rem;
    line-height: 1.25rem;
  }

  .CodeMirror-hint-active {
    background: #08f !important;
    color: #fff !important;
  }
  
  .hovered-link.CodeMirror-link {
    text-decoration: underline !important;
  }
  .cmd-ctrl-pressed .hovered-link.CodeMirror-link[data-url] {
    cursor: pointer;
    color: ${(props) => props.theme.textLink} !important;
  }
`;

export default GlobalStyle;
