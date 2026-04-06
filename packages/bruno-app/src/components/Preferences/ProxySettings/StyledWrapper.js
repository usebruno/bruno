import styled from 'styled-components';

const StyledWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;

  .settings-label {
    width: 100px;
  }

  .textbox {
    border: 1px solid #ccc;
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

  .pac-mode-toggle {
    display: inline-flex;
    flex-shrink: 0;
    border: 1px solid ${(props) => props.theme.input.border};
    border-radius: ${(props) => props.theme.border.radius.base};
    overflow: hidden;
    margin-right: 6px;
  }

  .pac-mode-btn {
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
    width: 265px;
  }

  .pac-file-btn {
    text-align: left;
    cursor: pointer;
    color: ${(props) => props.theme.colors.text.muted};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .pac-hint {
    font-size: ${(props) => props.theme.font.size.xs};
    color: ${(props) => props.theme.colors.text.muted};
    margin-top: 4px;
    padding-left: 100px;
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
