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
  .protocol-grpcs {
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
    animation: slideUpDown 6s infinite;
    transform: translateY(0);
  }

  .protocol-grpcs {
    animation: slideUpDown 6s infinite 3s;
    transform: translateY(100%);
  }

  @keyframes slideUpDown {
    0%, 45% {
      transform: translateY(0);
    }
    50%, 95% {
      transform: translateY(100%);
    }
    100% {
      transform: translateY(0);
    }
  }
`;

export default StyledWrapper;
