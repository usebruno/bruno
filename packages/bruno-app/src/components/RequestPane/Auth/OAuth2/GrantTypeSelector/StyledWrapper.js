import styled from 'styled-components';

const Wrapper = styled.div`
  font-size: 0.8125rem;

  .grant-type-mode-selector {
    padding: 0.5rem 0px;
    border-radius: 3px;
    border: solid 1px ${(props) => props.theme.input.border};
    background-color: ${(props) => props.theme.input.bg};

    .dropdown {
      width: 100%;

      div[data-tippy-root] {
        width: 100%;
      }
      .tippy-box {
        width: 100%;
        max-width: none !important;

        .tippy-content: {
          width: 100%;
          max-width: none !important;
        }
      }
    }

    .grant-type-label {
      width: 100%;
      color: ${(props) => props.theme.colors.text.yellow};
      justify-content: space-between;
      padding: 0 0.5rem;
    }

    .dropdown-item {
      padding: 0.2rem 0.6rem !important;
    }

    .label-item {
      padding: 0.2rem 0.6rem !important;
    }
  }

  .caret {
    color: rgb(140, 140, 140);
    fill: rgb(140 140 140);
  }
  label {
    font-size: 0.8125rem;
  }
`;

export default Wrapper;
