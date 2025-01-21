import styled from 'styled-components';

const StyledWrapper = styled.div`
  div.method-selector-container {
    border: solid 1px ${(props) => props.theme.modal.input.border};
    border-right: none;
    background-color: ${(props) => props.theme.modal.input.bg};
    border-top-left-radius: 3px;
    border-bottom-left-radius: 3px;

    .method-selector {
      min-width: 80px;
    }
  }

  div.method-selector-container,
  div.input-container {
    background-color: ${(props) => props.theme.modal.input.bg};
    height: 2.3rem;
  }

  div.input-container {
    border: solid 1px ${(props) => props.theme.modal.input.border};
    border-top-right-radius: 3px;
    border-bottom-right-radius: 3px;

    input {
      background-color: ${(props) => props.theme.modal.input.bg};
      outline: none;
      box-shadow: none;

      &:focus {
        outline: none !important;
        box-shadow: none !important;
      }
    }
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
`;

export default StyledWrapper;
