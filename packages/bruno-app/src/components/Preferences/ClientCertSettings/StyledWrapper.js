import styled from 'styled-components';

const StyledWrapper = styled.div`
  .settings-label {
    width: 90px;
  }

  .certificate-icon {
    color: ${(props) => props.theme.colors.text.yellow};
  }

  .non-passphrase-input {
    width: 300px;
  }

  /* Certificate row content (rendered inside the shared ListGroup rows) */
  .cert-icon {
    color: ${(props) => props.theme.colors.text.yellow};
  }

  .cert-field {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-size: 0.8125rem;
    min-width: 0;
  }

  .cert-field-label {
    flex-shrink: 0;
    width: 80px;
    color: ${(props) => props.theme.colors.text.muted};
  }

  .cert-field-value {
    min-width: 0;
  }

  /* Cert vs PFX segmented control */
  .type-picker {
    display: inline-flex;
    gap: 2px;
    padding: 2px;
    border-radius: ${(props) => props.theme.border.radius.base};
    background-color: ${(props) => props.theme.background.surface1};

    .type-option {
      font-size: 0.8125rem;
      line-height: 1;
      padding: 0.3rem 0.75rem;
      border-radius: ${(props) => props.theme.border.radius.sm};
      color: ${(props) => props.theme.colors.text.muted};
      transition: all ease-in-out 0.12s;

      &:hover {
        color: ${(props) => props.theme.text};
      }

      &.active {
        color: ${(props) => props.theme.text};
        background-color: ${(props) => props.theme.bg};
        box-shadow: 0 0 0 1px ${(props) => props.theme.border.border1};
      }
    }
  }

  /* Selected file in the add form */
  .file-chip {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.8125rem;
    color: ${(props) => props.theme.text};

    svg {
      color: ${(props) => props.theme.colors.text.muted};
    }
  }

  .textbox {
    padding: 0.15rem 0.45rem;
    outline: none;
    box-shadow: none;
    transition: border-color ease-in-out 0.1s;
    border-radius: 3px;
    background-color: ${(props) => props.theme.input.bg};
    border: 1px solid ${(props) => props.theme.input.border};

    &:focus {
      border: solid 1px ${(props) => props.theme.input.focusBorder} !important;
      outline: none !important;
    }
  }

  .protocol-placeholder {
    height: 100%;
    position: relative;
    display: inline-block;
    width: 60px;
    overflow: hidden;
    color: ${(props) => props.theme.colors.text.muted};
  }

  .protocol-https,
  .protocol-grpcs,
  .protocol-wss {
    position: absolute;
    right: 8px;
    top: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .protocol-https {
    animation: slideUpDown 9s infinite;
    transform: translateY(0);
  }

  .protocol-grpcs {
    animation: slideUpDown 9s infinite 3s;
    transform: translateY(100%);
  }

  .protocol-wss {
    animation: slideUpDown 9s infinite 6s;
    transform: translateY(100%);
  }

  @keyframes slideUpDown {
    0%, 30% {
      transform: translateY(0);
    }
    33.33%, 97% {
      transform: translateY(100%);
    }
    100% {
      transform: translateY(0);
    }
  }
`;

export default StyledWrapper;
