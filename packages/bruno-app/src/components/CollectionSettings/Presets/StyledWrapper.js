import styled from 'styled-components';
import { rgba } from 'polished';

const StyledWrapper = styled.div`
  max-width: 800px;

  .preset-section {
    display: flex;
    gap: 1rem;
    padding: 1rem 0;
  }

  .preset-section-icon {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 8px;
    color: ${(props) => props.theme.colors.text.muted};

    &.requests {
      color: ${(props) => props.theme.textLink};
      background-color: ${(props) => rgba(props.theme.textLink, 0.06)};
    }

    &.environment {
      color: ${(props) => props.theme.colors.text.green};
      background-color: ${(props) => rgba(props.theme.colors.text.green, 0.06)};
    }
  }

  .preset-section-body {
    flex: 1 1 auto;
    min-width: 0;
  }

  .preset-section-title {
    font-size: ${(props) => props.theme.font.size.base};
    font-weight: 600;
    color: ${(props) => props.theme.text};
  }

  .preset-section-subtitle {
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.colors.text.muted};
    margin-top: 0.125rem;
  }

  .preset-field {
    margin-top: 1rem;

    .preset-field-label {
      display: block;
      font-weight: 500;
      margin-bottom: 0.375rem;
    }

    .preset-field-hint {
      font-size: ${(props) => props.theme.font.size.xs};
      color: ${(props) => props.theme.colors.text.muted};
      margin-top: 0.375rem;
      max-width: 520px;
      line-height: 1.4;
    }
  }

  .preset-input {
    width: 100%;
    max-width: 420px;
  }

  .default-env-dropdown {
    max-width: 420px;

    /* Tippy renders the trigger as the reference element; make it fill the field. */
    > * {
      width: 100%;
    }

    .default-env-trigger {
      width: 100%;
      box-sizing: border-box;
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
    padding: 0.15rem 0.45rem;
    box-shadow: none;
    outline: none;
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
