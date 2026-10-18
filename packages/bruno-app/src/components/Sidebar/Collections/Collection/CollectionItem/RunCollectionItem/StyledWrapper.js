import styled from 'styled-components';

const Wrapper = styled.div`
  .bruno-modal-content {
    padding-bottom: 1rem;
  }

  .description {
    color: ${(props) => props.theme.colors.text.muted};
  }

  .divider {
    border: none;
    border-top: 1px solid ${(props) => props.theme.input.border};
    margin: 1rem 0rem;
  }

  .warning {
    color: ${(props) => props.theme.colors.text.danger};
  }

  div:has(> .single-line-editor) {
    height: 1.875rem;
    border: 1px solid ${(props) => props.theme.input.border};
    border-radius: ${(props) => props.theme.border.radius.sm};
    background-color: ${(props) => props.theme.input.bg};
    padding: 0.2rem 0.5rem;
  }

  div:has(> .single-line-editor):focus-within {
    border-color: ${(props) => props.theme.input.focusBorder};
  }

  .single-line-editor {
    height: 1.475rem;
    font-size: ${(props) => props.theme.font.size.sm};

    .CodeMirror {
      height: 1.475rem;
      line-height: 1.475rem;
    }

    .CodeMirror-cursor {
      height: 0.875rem !important;
      margin-top: 0.3rem !important;
    }
  }

  input[type='radio'] {
    cursor: pointer;
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    border: 1px solid ${(props) => props.theme.input.border};
    background-color: ${(props) => props.theme.bg};
    flex-shrink: 0;

    &:focus-visible {
      outline: 2px solid ${(props) => props.theme.input.focusBorder};
      outline-offset: 2px;
    }

    &:checked {
      border: 1px solid ${(props) => props.theme.primary.solid};
      background-image: radial-gradient(circle, ${(props) => props.theme.primary.solid} 40%, ${(props) => props.theme.bg} 42%);
    }
  }
`;

export default Wrapper;
