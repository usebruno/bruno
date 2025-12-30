import styled from 'styled-components';
import { rgba } from 'polished';

const Wrapper = styled.div`
  .oauth2-icon-container {
    background-color: ${(props) => rgba(props.theme.primary.solid, 0.1)};
  }

  .oauth2-icon {
    color: ${(props) => props.theme.primary.solid};
  }

  label {
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.colors.text.subtext1};
  }
  .single-line-editor-wrapper {
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

        .tippy-content: {
          width: fit-content;
          max-width: none !important;
          min-width: 100px;
        }
      }
    }

    .token-placement-label {
      width: fit-content;
      // color: ${(props) => props.theme.colors.text.yellow};
      justify-content: space-between;
      padding: 0 0.5rem;
      min-width: 100px;
    }

    .dropdown-item {
      padding: 0.2rem 0.6rem !important;
    }
  }

  input[type='checkbox'] {
    cursor: pointer;
    accent-color: ${(props) => props.theme.primary.solid};
  }
`;

export default Wrapper;
