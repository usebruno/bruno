import styled from 'styled-components';

const StyledWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;

  .proxy-settings {
    max-width: 500px;
    font-size: ${(props) => props.theme.font.size.base};
  }

  .textbox {
    width: 100%;
    min-width: 0;
    height: 34px;
    padding: 0 10px;
    line-height: normal;
    border-radius: ${(props) => props.theme.border.radius.sm};
    border: 1px solid ${(props) => props.theme.input.border};
    background-color: ${(props) => props.theme.input.bg};
    color: ${(props) => props.theme.text};
    box-shadow: none;
    outline: none;
    transition: border-color ease-in-out 0.1s;

    &:focus,
    &:focus-within {
      border: solid 1px ${(props) => props.theme.input.focusBorder} !important;
      outline: none !important;
    }
  }

  .mono {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: ${(props) => props.theme.font.size.sm};
  }

  /* Password input + show/hide button inside one bordered field */
  .password-field {
    display: flex;
    align-items: center;
    padding-right: 3px;

    input {
      flex: 1;
      min-width: 0;
      height: 100%;
      background: transparent;
      border: none;
      outline: none;
      color: inherit;
    }

    .password-toggle {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      color: ${(props) => props.theme.colors.text.muted};

      &:hover {
        color: ${(props) => props.theme.text};
      }
    }
  }

  .protocol-trigger {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    height: 34px;
    padding: 0 10px;
    border-radius: ${(props) => props.theme.border.radius.sm};
    border: 1px solid ${(props) => props.theme.input.border};
    background-color: ${(props) => props.theme.input.bg};
    color: ${(props) => props.theme.text};
    cursor: pointer;
    transition: border-color ease-in-out 0.1s;

    &:hover,
    &:focus-visible {
      border-color: ${(props) => props.theme.input.focusBorder};
      outline: none;
    }
  }

  .pac-mode-toggle {
    display: inline-flex;
    flex-shrink: 0;
    border: 1px solid ${(props) => props.theme.input.border};
    border-radius: ${(props) => props.theme.border.radius.sm};
    overflow: hidden;
  }

  .pac-mode-btn {
    height: 32px;
    padding: 0.1rem 0.6rem;
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
    flex: 1;
    width: auto;
  }

  .pac-file-btn {
    display: flex;
    align-items: center;
    text-align: left;
    cursor: pointer;
    color: ${(props) => props.theme.colors.text.muted};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .system-proxy-settings {
    /* SystemProxy lines up its variable rows on a fixed label column */
    .settings-label {
      width: 100px;
    }

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
