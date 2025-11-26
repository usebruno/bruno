import styled from 'styled-components';

const Wrapper = styled.div`
  label {
    font-size: 0.8125rem;
  }
  .oauth2-input-wrapper {
    max-width: 400px;
    padding: 0.15rem 0.4rem;
    border-radius: 3px;
    border: solid 1px ${(props) => props.theme.input.border};
    background-color: ${(props) => props.theme.input.bg};
  }

  .token-placement-selector {
    padding: 0.5rem 0px;
    border-radius: 3px;
    border: solid 1px ${(props) => props.theme.input.border};
    background-color: ${(props) => props.theme.input.bg};
    min-width: 100px;

    .dropdown {
      width: fit-content;
      min-width: 100px;

      div[data-tippy-root] {
        width: fit-content;
        min-width: 100px;
      }
      .tippy-box {
        width: fit-content;
        max-width: none !important;
        min-width: 100px;

        .tippy-content {
          width: fit-content;
          max-width: none !important;
          min-width: 100px;
        }
      }
    }

    .token-placement-label {
      width: fit-content;
      justify-content: space-between;
      padding: 0 0.5rem;
      min-width: 100px;
    }

    .dropdown-item {
      padding: 0.2rem 0.6rem !important;
    }
  }
  
  .checkbox-label {
    color: ${(props) => props.theme.colors.text.primary};
    user-select: none;
  }
`;

export default Wrapper; 