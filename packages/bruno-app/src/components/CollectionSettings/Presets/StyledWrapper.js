import styled from 'styled-components';

const StyledWrapper = styled.div`
  /* Same width as the Proxy page, its neighbour in the Settings sidebar */
  .presets-settings {
    max-width: 500px;
    font-size: ${(props) => props.theme.font.size.base};
  }

  /* As wide as its widest item (the request type control), so the Base URL input matches it */
  .presets-fields {
    width: max-content;
    max-width: 100%;
  }

  .textbox {
    width: 100%;
    min-width: 0;
    height: 34px;
    padding: 0 10px;
    border-radius: ${(props) => props.theme.border.radius.sm};
    border: 1px solid ${(props) => props.theme.input.border};
    background-color: ${(props) => props.theme.input.bg};
    color: ${(props) => props.theme.text};
    box-shadow: none;
    outline: none;
    transition: border-color ease-in-out 0.1s;

    &:focus {
      border: solid 1px ${(props) => props.theme.input.focusBorder} !important;
      outline: none !important;
    }
  }

  .default-env-dropdown {
    width: 200px;

    /* Tippy renders the trigger as the reference element; make it fill the field. */
    > * {
      width: 100%;
    }

    [role='menu'] {
      max-height: 16rem;
      overflow-y: auto;
    }

    .default-env-trigger {
      width: 100%;
      height: 34px;
      box-sizing: border-box;
      gap: 0.5rem;
      padding: 0 10px;
      border-radius: ${(props) => props.theme.border.radius.sm};
      background-color: ${(props) => props.theme.input.bg};
      border: 1px solid ${(props) => props.theme.input.border};
      color: ${(props) => props.theme.text};
      transition: border-color ease-in-out 0.1s;
      font: inherit;
      appearance: none;

      &:hover {
        border-color: ${(props) => props.theme.input.focusBorder};
      }

      &:focus-visible {
        outline: none;
        border-color: ${(props) => props.theme.input.focusBorder};
      }

      .caret {
        color: ${(props) => props.theme.colors.text.muted};
        flex-shrink: 0;
      }
    }
  }
`;

export default StyledWrapper;
