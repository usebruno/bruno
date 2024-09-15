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
    background-color: ${(props) => props.theme.modal.input.bg};
    border: 1px solid ${(props) => props.theme.modal.input.border};

    &:focus {
      border: solid 1px ${(props) => props.theme.modal.input.focusBorder} !important;
      outline: none !important;
    }
  }

  .system-proxy-settings {
    label {
      color: ${(props) => props.theme.colors.text.yellow};
    }
  }
`;

export default StyledWrapper;
