import styled from 'styled-components';
import { rgba } from 'polished';

const Wrapper = styled.div`
  .oauth1-icon-container {
    background-color: ${(props) => rgba(props.theme.primary.solid, 0.1)};
  }

  label {
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.colors.text.subtext1};
  }

  .oauth1-section-label {
    color: ${(props) => props.theme.text};
  }

  .single-line-editor-wrapper {
    max-width: 400px;
    padding: 0.15rem 0.4rem;
    border-radius: 3px;
    border: solid 1px ${(props) => props.theme.input.border};
    background-color: ${(props) => props.theme.input.bg};
  }

  .oauth1-dropdown-selector {
    font-size: ${(props) => props.theme.font.size.sm};
    padding: 0.2rem 0px;
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

    .oauth1-dropdown-label {
      width: fit-content;
      justify-content: space-between;
      padding: 0 0.5rem;
      min-width: 100px;
    }

    .dropdown-item {
      padding: 0.2rem 0.6rem !important;
    }
  }

  .private-key-editor-wrapper {
    padding: 0.15rem 0.4rem;
    border-radius: 3px;
    border: solid 1px ${(props) => props.theme.input.border};
    background-color: ${(props) => props.theme.input.bg};
    max-width: 400px;
    overflow: hidden;
  }

  input[type='checkbox'] {
    cursor: pointer;
    accent-color: ${(props) => props.theme.primary.solid};
  }

  .transition-transform {
    transition: transform 0.15s ease;
  }

  .rotate-90 {
    transform: rotate(90deg);
  }
`;

export default Wrapper;
