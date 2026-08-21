import styled from 'styled-components';

const StyledWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;

  color: ${(props) => props.theme.text};

  form.settings-form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    max-width: 40rem;
  }

  .server-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 8.5rem;
    gap: 1rem;
  }

  .auth-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1rem;
  }

  /* Deliberately not reusing the .textbox class here. The wrapper needs its own
     padding so the nested input can sit flush inside it; mixing the two means a
     padding shorthand and a longhand at equal specificity, where the winner
     depends on stylesheet order. Restating the .textbox visuals keeps this box
     exactly as tall as a plain input next to it. */
  .password-field {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    width: 100%;
    line-height: 1.5;
    padding: 0.45rem;
    border-radius: ${(props) => props.theme.border.radius.sm};
    background-color: ${(props) => props.theme.input.bg};
    border: 1px solid ${(props) => props.theme.input.border};
    color: ${(props) => props.theme.text};

    &:focus-within {
      border-color: ${(props) => props.theme.input.focusBorder};
    }

    .password-input {
      flex: 1 1 auto;
      min-width: 0;
      padding: 0;
      border: none;
      outline: none;
      background: transparent;
      color: inherit;
      font: inherit;
      line-height: inherit;

      &:disabled {
        cursor: not-allowed;
      }
    }

    /* zero padding/line-height so the icon can't make this row taller than the
       plain inputs beside it */
    .password-toggle {
      display: inline-flex;
      align-items: center;
      flex-shrink: 0;
      padding: 0;
      border: none;
      background: none;
      line-height: 0;
      color: ${(props) => props.theme.colors.text.muted};
      cursor: pointer;

      &:hover:not(:disabled) {
        color: ${(props) => props.theme.text};
      }

      &:disabled {
        cursor: not-allowed;
      }
    }
  }

  .pac-mode-toggle {
    display: inline-flex;
    flex-shrink: 0;
    border: 1px solid ${(props) => props.theme.input.border};
    border-radius: ${(props) => props.theme.border.radius.base};
    overflow: hidden;
  }

  .pac-mode-btn {
    padding: 0.45rem 0.75rem;
    font-size: ${(props) => props.theme.font.size.sm};
    font-weight: 500;
    color: ${(props) => props.theme.colors.text.muted};
    background: transparent;
    border: none;
    cursor: pointer;
    transition: background 0.12s, color 0.12s;
    white-space: nowrap;

    &.active {
      background: ${(props) => props.theme.button.secondary.bg};
      color: ${(props) => props.theme.button.secondary.color};
    }

    &:hover:not(.active) {
      color: ${(props) => props.theme.text};
    }
  }

  .pac-source-input {
    flex: 1 1 auto;
    min-width: 0;
  }

  .pac-file-btn {
    text-align: left;
    cursor: pointer;
    color: ${(props) => props.theme.colors.text.muted};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .pac-refetch {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    width: fit-content;
    margin-top: 0.625rem;
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.textLink};
    cursor: pointer;

    &:hover {
      text-decoration: underline;
    }
  }

  .system-proxy-settings {
    label {
      color: ${(props) => props.theme.colors.text.yellow};
    }

    .system-proxy-title {
      color: ${(props) => props.theme.text};
    }

    .system-proxy-description {
      color: ${(props) => props.theme.colors.text.muted};
    }

    .system-proxy-error-container {
      background: ${(props) => props.theme.status.danger.background};
      border: 1px solid ${(props) => props.theme.status.danger.border};
      width: fit-content;
    }

    .system-proxy-error-text {
      color: ${(props) => props.theme.status.danger.text};
    }

    .system-proxy-source-label {
      color: ${(props) => props.theme.colors.text.muted};
    }

    .system-proxy-source-value {
      color: ${(props) => props.theme.text};
    }

    .system-proxy-info-text {
      color: ${(props) => props.theme.colors.text.muted};
    }

    .system-proxy-value {
      color: ${(props) => props.theme.colors.text.purple};
      opacity: 0.8;
    }
  }
`;

export default StyledWrapper;
