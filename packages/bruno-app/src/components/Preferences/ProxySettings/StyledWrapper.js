import styled from 'styled-components';

const StyledWrapper = styled.div`
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
