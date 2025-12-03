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

  .available-certificates {
    background-color: ${(props) => props.theme.requestTabPanel.url.bg};

    button.remove-certificate {
      color: ${(props) => props.theme.colors.text.danger};
    }
  }

  .textbox {
    border: 1px solid #ccc;
    padding: 0.15rem 0.45rem;
    box-shadow: none;
    border-radius: 0px;
    outline: none;
    box-shadow: none;
    transition: border-color ease-in-out 0.1s;
    border-radius: 3px;
    background-color: ${(props) => props.theme.modal.input.bg};
    border: 1px solid ${(props) => props.theme.modal.input.border};

    &:focus {
      border: solid 1px ${(props) => props.theme.modal.input.focusBorder} !important;
      outline: none !important;
    }
  }

  .protocol-placeholder {
    height: 100%;
    position: relative;
    display: inline-block;
    width: 60px;
    overflow: hidden;
  }

  .protocol-https,
  .protocol-grpcs,
  .protocol-wss {
    position: absolute;
    right: 8px;
    top: 0;
    bottom: 0;
    transition: transform 0.3s ease-in-out;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .protocol-https {
    animation: slideHttps 9s infinite;
  }

  .protocol-grpcs {
    animation: slideGrpcs 9s infinite;
  }

  .protocol-wss {
    animation: slideWss 9s infinite;
  }

  @keyframes slideHttps {
    0%, 30% {
      transform: translateY(0);
    }
    33.33%, 100% {
      transform: translateY(-100%);
    }
  }

  @keyframes slideGrpcs {
    0%, 30% {
      transform: translateY(100%);
    }
    33.33%, 63.33% {
      transform: translateY(0);
    }
    66.66%, 100% {
      transform: translateY(-100%);
    }
  }

  @keyframes slideWss {
    0%, 63.33% {
      transform: translateY(100%);
    }
    66.66%, 96.66% {
      transform: translateY(0);
    }
    100% {
      transform: translateY(-100%);
    }
  }
`;

export default StyledWrapper;
