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
    border-radius: 2px;
    box-shadow: ${(props) => props.theme.codemirror.variable.info.boxShadow};
    box-sizing: border-box;
    font-size: 13px;
    line-height: 16px;
    margin: 8px -8px;
    max-width: 800px;
    opacity: 0;
    overflow: hidden;
    padding: 8px 8px;
    position: fixed;
    transition: opacity 0.15s;
    z-index: 50;
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
