import { createGlobalStyle } from "styled-components"

const GlobalStyle = createGlobalStyle`
  .CodeMirror-gutters {
    background-color: var(--color-codemirror-background);
    border-right: solid 1px var(--color-codemirror-border);
  }

  main {
    background-color: var(--color-primary-theme);
  }

  .bruno-form {
    .textbox {
      line-height: 1.42857143;
      background-color: #fff;
      background-image: none;
      border: 1px solid #ccc;
      padding: 0.45rem;
      box-shadow: none;
      border-radius: 0px;
      outline: none;
      box-shadow: none;
      transition: border-color ease-in-out .1s;
      border-radius: 3px;

      &:focus {
        border: solid 1px #8b8b8b !important;
        outline: none !important;
      }
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
`

export default GlobalStyle
