import styled from 'styled-components';

const StyledWrapper = styled.div`
  label {
    font-size: 0.8125rem;
    font-weight: 600;
  }

  .single-line-editor-wrapper {
    padding: 0.15rem 0.4rem;
    border-radius: 3px;
    border: solid 1px ${(props) => props.theme.input.border};
    background-color: ${(props) => props.theme.input.bg};

    &.is-secret input {
      -webkit-text-security: disc;
    }

    &:focus-within {
      border: solid 1px ${(props) => props.theme.input.focusBorder} !important;
    }
  }

  .signature-method-selector,
  .parameter-transmission-selector {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem 0;

    label {
      flex: 1;
    }

    .dropdown {
      width: 250px;
    }
  }

  .get-access-token-btn {
    margin-top: 1rem;
  }

  .token-display {
    margin-top: 1rem;
    padding: 0.75rem;
    background-color: ${(props) => props.theme.bg};
    border: 1px solid ${(props) => props.theme.input.border};
    border-radius: 3px;
    font-family: monospace;
    font-size: 0.8125rem;

    .token-label {
      font-weight: 600;
      margin-bottom: 0.25rem;
    }

    .token-value {
      word-break: break-all;
      color: ${(props) => props.theme.colors.text.muted};
    }
  }

  .help-text {
    font-size: 0.75rem;
    color: ${(props) => props.theme.colors.text.muted};
    margin-top: 0.25rem;
  }
`;

export default StyledWrapper;
