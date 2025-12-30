import styled from 'styled-components';
import { rgba } from 'polished';

const Wrapper = styled.div`
  .oauth2-icon-container {
    background-color: ${(props) => rgba(props.theme.primary.solid, 0.1)};
  }

  .oauth2-icon {
    color: ${(props) => props.theme.primary.solid};
  }

  font-size: ${(props) => props.theme.font.size.base};

  .grant-type-mode-selector {
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

    .grant-type-label {
      width: fit-content;
      color: ${(props) => props.theme.brand};
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
    font-size: ${(props) => props.theme.font.size.base};
  }
`;

export default Wrapper;
