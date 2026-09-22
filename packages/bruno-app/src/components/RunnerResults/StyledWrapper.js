import styled from 'styled-components';

const Wrapper = styled.div`
  .textbox {
    padding: 0.2rem 0.5rem;
    outline: none;
    font-size: ${(props) => props.theme.font.size.sm};
    border-radius: ${(props) => props.theme.border.radius.sm};
    background-color: ${(props) => props.theme.input.bg};
    border: 1px solid ${(props) => props.theme.input.border};
    height: 1.875rem;

    &:focus {
      outline: none;
      border-color: ${(props) => props.theme.input.focusBorder};
    }

    &[type='number'] {
      -moz-appearance: textfield;
      appearance: textfield;
      &::-webkit-outer-spin-button,
      &::-webkit-inner-spin-button {
        -webkit-appearance: none;
        margin: 0;
      }
    }
  }

  /* Radio button styles */
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

  .item-path {
    .link {
      color: ${(props) => props.theme.textLink};
    }
  }
  .danger {
    color: ${(props) => props.theme.colors.text.danger};
  }

  .test-summary {
    color: ${(props) => props.theme.tabs.active.border};
  }

  /* test results */
  .test-success {
    color: ${(props) => props.theme.colors.text.green};
  }

  .test-failure {
    color: ${(props) => props.theme.colors.text.danger};

    .error-message {
      color: ${(props) => props.theme.colors.text.muted};
    }
  }
  
  .skipped-request {
    color: ${(props) => props.theme.colors.text.muted};
  }

  .text-muted {
    color: ${(props) => props.theme.colors.text.muted};
  }

  .text-green {
    color: ${(props) => props.theme.colors.text.green};
  }

  .text-subtext0 {
    color: ${(props) => props.theme.colors.text.subtext0};
  }

  .text-subtext1 {
    color: ${(props) => props.theme.colors.text.subtext1};
  }

  .hover-bg-surface {
    &:hover {
      background-color: ${(props) => props.theme.background.surface1};
    }
  }

  .button-sm {
    font-size: ${(props) => props.theme.font.size.sm};
  }

  .run-config-panel, .run-config-option {
    border-color: ${(props) => props.theme.background.surface1};
  }

  .runner-section-title {
    font-size: ${(props) => props.theme.font.size.sm};
    font-weight: 600;
  }

  .runner-section {
    font-size: ${(props) => props.theme.font.size.sm};

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
  }

  /* Icon-only actions: the label is dropped, so aria-label carries the name. */
  .tiny .runner-actions {
    .button-content {
      display: none;
    }

    button {
      padding-left: 0.5rem;
      padding-right: 0.5rem;
    }
  }
`;

export default Wrapper;
