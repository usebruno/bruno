import styled from 'styled-components';

const StyledWrapper = styled.div`
  max-width: 800px;

  .settings-label {
    flex: 0 0 170px;
    width: 170px;
    white-space: nowrap;
  }

  .default-env-dropdown {
    .default-env-trigger {
      min-width: 220px;
      gap: 0.5rem;
      padding: 0.25rem 0.5rem;
      border-radius: 3px;
      background-color: ${(props) => props.theme.input.bg};
      border: 1px solid ${(props) => props.theme.input.border};
      color: ${(props) => props.theme.text};
      transition: border-color ease-in-out 0.1s;

      &:hover {
        border-color: ${(props) => props.theme.input.focusBorder};
      }

      .caret {
        color: ${(props) => props.theme.colors.text.muted};
        flex-shrink: 0;
      }
    }
  }

  .textbox {
    border: 1px solid #ccc;
    padding: 0.15rem 0.45rem;
    box-shadow: none;
    border-radius: 0px;
    outline: none;
    box-shadow: none;
    transition: border-color ease-in-out 0.1s;
    border-radius: 3px;
    background-color: ${(props) => props.theme.input.bg};
    border: 1px solid ${(props) => props.theme.input.border};

    &:focus {
      border: solid 1px ${(props) => props.theme.input.focusBorder} !important;
      outline: none !important;
    }
  }
`;

export default StyledWrapper;
