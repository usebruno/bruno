import styled from 'styled-components';

const StyledWrapper = styled.div`
  max-width: 800px;

  .preset-field {
    margin-top: 1.5rem;

    &:first-of-type {
      margin-top: 0;
    }

    .preset-field-label {
      display: block;
      font-weight: 500;
      color: ${(props) => props.theme.text};
    }

    .preset-field-subtitle {
      font-size: ${(props) => props.theme.font.size.sm};
      color: ${(props) => props.theme.colors.text.muted};
      margin-top: 0.125rem;
      margin-bottom: 0.625rem;
    }
  }

  .preset-input {
    width: 100%;
    max-width: 420px;
  }

  .preset-field .preset-input.textbox {
    padding: 0.3rem 0.6rem;
  }

  .default-env-dropdown {
    max-width: 420px;

    /* Tippy renders the trigger as the reference element; make it fill the field. */
    > * {
      width: 100%;
    }

    [role='menu'] {
      max-height: 16rem;
      overflow-y: auto;
    }

    .default-env-trigger {
      width: 100%;
      box-sizing: border-box;
      gap: 0.5rem;
      padding: 0.3rem 0.6rem;
      border-radius: 3px;
      background-color: ${(props) => props.theme.input.bg};
      border: 1px solid ${(props) => props.theme.input.border};
      color: ${(props) => props.theme.text};
      transition: border-color ease-in-out 0.1s;
      font: inherit;
      appearance: none;

      &:hover {
        border-color: ${(props) => props.theme.input.focusBorder};
      }

      &:focus-visible {
        outline: none;
        border-color: ${(props) => props.theme.input.focusBorder};
      }

      .caret {
        color: ${(props) => props.theme.colors.text.muted};
        flex-shrink: 0;
      }
    }
  }

  .textbox {
    padding: 0.15rem 0.45rem;
    box-shadow: none;
    outline: none;
    transition: border-color ease-in-out 0.1s;
    border-radius: 3px;
    background-color: ${(props) => props.theme.input.bg};
    border: 1px solid ${(props) => props.theme.input.border};

    &:focus {
      border: solid 1px ${(props) => props.theme.input.focusBorder} !important;
      outline: none !important;
    }
  }
`;

export default StyledWrapper;
