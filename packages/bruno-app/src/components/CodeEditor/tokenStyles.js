import { css } from 'styled-components';

const codemirrorTokenStyles = css`
  .cm-s-default,
  .cm-s-monokai {
    span.cm-def {
      color: ${(props) => props.theme.codemirror.tokens.definition} !important;
    }
    span.cm-property {
      color: ${(props) => props.theme.codemirror.tokens.property} !important;
    }
    span.cm-string {
      color: ${(props) => props.theme.codemirror.tokens.string} !important;
    }
    span.cm-number {
      color: ${(props) => props.theme.codemirror.tokens.number} !important;
    }
    span.cm-atom {
      color: ${(props) => props.theme.codemirror.tokens.atom} !important;
    }
    span.cm-variable,
    span.cm-variable-2 {
      color: ${(props) => props.theme.codemirror.tokens.variable} !important;
    }
    span.cm-keyword {
      color: ${(props) => props.theme.codemirror.tokens.keyword} !important;
    }
    span.cm-comment {
      color: ${(props) => props.theme.codemirror.tokens.comment} !important;
    }
    span.cm-operator {
      color: ${(props) => props.theme.codemirror.tokens.operator} !important;
    }
    span.cm-tag {
      color: ${(props) => props.theme.codemirror.tokens.tag} !important;
    }
    span.cm-tag.cm-bracket {
      color: ${(props) => props.theme.codemirror.tokens.tagBracket} !important;
    }
  }

  .cm-variable-valid {
    color: ${(props) => props.theme.codemirror.variable.valid} !important;
  }
  .cm-variable-invalid {
    color: ${(props) => props.theme.codemirror.variable.invalid} !important;
  }
`;

export default codemirrorTokenStyles;
