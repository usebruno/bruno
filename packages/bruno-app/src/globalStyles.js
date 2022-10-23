import { createGlobalStyle } from 'styled-components';

const GlobalStyle = createGlobalStyle`
  .CodeMirror-gutters {
    background-color: ${(props) => props.theme.codemirror.gutter.bg} !important;
    border-right: solid 1px ${(props) => props.theme.codemirror.border};
  }

  .text-link {
    color: ${(props) => props.theme.textLink};
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
    border: solid 1px ${(props) => props.theme.button.close.border};;

    &:hover,
    &:focus {
      outline: none;
      box-shadow: none;
      border: solid 1px #696969;
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
`;

export default GlobalStyle;
