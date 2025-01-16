import styled from 'styled-components';

const Wrapper = styled.div`
  label {
    font-size: 0.8125rem;
  }

  .single-line-editor-wrapper {
    padding: 0.15rem 0.4rem;
    border-radius: 3px;
    border: solid 1px ${(props) => props.theme.input.border};
    background-color: ${(props) => props.theme.input.bg};
  }

  .auth-placement-selector {
    padding: 0.5rem 0px;
    border-radius: 3px;
    border: solid 1px ${(props) => props.theme.input.border};
    background-color: ${(props) => props.theme.input.bg};

    .dropdown {
      width: fit-content;

      div[data-tippy-root] {
        width: fit-content;
      }
      .tippy-box {
        width: fit-content;
        max-width: none !important;

        .tippy-content: {
          width: fit-content;
          max-width: none !important;
        }
      }
    }

    .auth-type-label {
      width: fit-content;
      color: ${(props) => props.theme.colors.text.yellow};
      justify-content: space-between;
      padding: 0 0.5rem;
    }

    .dropdown-item {
      padding: 0.2rem 0.6rem !important;
    }
  }

  .caret {
    color: rgb(140, 140, 140);
    fill: rgb(140 140 140);
  }
`;

export default Wrapper;
