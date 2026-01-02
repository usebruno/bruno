import styled from 'styled-components';

const StyledWrapper = styled.div`
  div.method-selector-container {
    border: solid 1px ${(props) => props.theme.input.border};
    border-right: none;
    background-color: ${(props) => props.theme.input.bg};
    border-top-left-radius: ${(props) => props.theme.border.radius.base};
    border-bottom-left-radius: ${(props) => props.theme.border.radius.base};
  }
  div.method-selector-container,
  div.input-container {
    background-color: ${(props) => props.theme.input.bg};
    height: 2.1rem;
  }
  div.input-container {
    border: solid 1px ${(props) => props.theme.input.border};
    border-top-right-radius: ${(props) => props.theme.border.radius.base};
    border-bottom-right-radius: ${(props) => props.theme.border.radius.base};
    input {
      background-color: ${(props) => props.theme.input.bg};
      outline: none;
      box-shadow: none;
      &:focus {
        outline: none !important;
        box-shadow: none !important;
      }
    }
  }

  .textbox {
    border-radius: ${(props) => props.theme.border.radius.base} !important;
    height: 2.1rem;
  }

  textarea.curl-command {
    min-height: 150px;
  }
  .dropdown {
    width: fit-content;

    .dropdown-item {
      padding: 0.2rem 0.6rem !important;
    }
  }

  .advanced-options {
    .caret {
      color: ${(props) => props.theme.textLink};
      fill: ${(props) => props.theme.textLink};
    }
  }
`;

export default StyledWrapper;
