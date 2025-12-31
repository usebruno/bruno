import styled from 'styled-components';
import { rgba } from 'polished';

const StyledWrapper = styled.div`
  .sandbox-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.375rem;
    height: 1.375rem;
    border-radius: ${(props) => props.theme.border.radius.base};
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover {
      opacity: 0.8;
    }
  }

  .safe-mode {
    color: ${(props) => props.theme.app.collection.toolbar.sandboxMode.safeMode.color};
    background-color: ${(props) => props.theme.app.collection.toolbar.sandboxMode.safeMode.bg};
  }

  .developer-mode {
    color: ${(props) => props.theme.app.collection.toolbar.sandboxMode.developerMode.color};
    background-color: ${(props) => props.theme.app.collection.toolbar.sandboxMode.developerMode.bg};
  }

  .sandbox-dropdown {
    min-width: 260px;
    max-width: 380px;
  }

  .sandbox-header {
    padding: 0.5rem 0.625rem;
    font-size: ${(props) => props.theme.font.size.base};
    color: ${(props) => props.theme.dropdown.headingText};
  }

  .sandbox-option {
    display: flex;
    margin: 5px;
    border-radius: ${(props) => props.theme.border.radius.md};
    padding: 12px;
    align-items: flex-start;
    text-align: left;
    gap: 0.5rem;
    position: relative;

    &.safe-mode {
      border: 1px solid ${(props) => props.theme.input.border};
      color: ${(props) => props.theme.colors.text.green};
      margin-bottom: 10px;
    }

    &.developer-mode {
      border: 1px solid ${(props) => props.theme.input.border};
      color: ${(props) => props.theme.colors.text.warning};
    }

    &.active {
      cursor: default;

      &.developer-mode {
        border: 1px solid ${(props) => props.theme.colors.text.warning};
        background-color: ${(props) => rgba(props.theme.colors.text.warning, 0.04)};

        .sandbox-option-radio input:checked {
          border-color: ${(props) => props.theme.colors.text.warning};
        }

        .sandbox-option-radio input::after {
          background: ${(props) => props.theme.colors.text.warning};
        }
      }

      &.safe-mode {
        border: 1px solid ${(props) => props.theme.colors.text.green};
        background-color: ${(props) => rgba(props.theme.colors.text.green, 0.04)};

        .sandbox-option-radio input:checked {
          border-color: ${(props) => props.theme.colors.text.green};
        }

        .sandbox-option-radio input::after {
          background: ${(props) => props.theme.colors.text.green};
        }
      }
    }

    svg {
      width: 2rem;
    }
  }

  .recommended-badge {
    padding: 0.125rem 0.5rem;
    font-size: ${(props) => props.theme.font.size.xs};
    background-color: ${(props) => rgba(props.theme.colors.text.green, 0.1)};
    color: ${(props) => props.theme.colors.text.green};
    border-radius: ${(props) => props.theme.border.radius.sm};
  }

  .sandbox-option-title {
    display: flex;
    align-items: center;
    font-size: ${(props) => props.theme.font.size.base};
    gap: 0.25rem;
    line-height: 1.25rem;
    color: ${(props) => props.theme.colors.text.subtext2};
  }

  .sandbox-option-radio {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 0.25rem;
  }

  .sandbox-option-radio input {
    appearance: none;
    width: 18px;
    height: 18px;
    border-radius: 9999px;
    border: 1px solid currentColor;
    background: transparent;
    cursor: pointer;
    position: relative;
    transition: all 0.15s ease;
  }

  .sandbox-option-radio input::after {
    content: '';
    position: absolute;
    inset: 3px;
    border-radius: 9999px;
    background: ${(props) => props.theme.background.base};
    opacity: 0;
    transform: scale(0.5);
    transition: all 0.15s ease;
  }

  .sandbox-option-radio input:checked::after {
    opacity: 1;
    transform: scale(1);
  }

  .sandbox-option-radio input:focus-visible {
    outline: none;
  }

  .sandbox-option-description {
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.colors.text.muted};
    line-height: 1.1rem;
    margin-top: 0.25rem;
  }

  .developer-mode-warning {
    margin-top: 0.5rem;
    padding: 0.25rem 0.5rem;
    display: inline-block;
    background-color:   ${(props) => rgba(props.theme.colors.text.warning, 0.1)};
    border-radius: ${(props) => props.theme.border.radius.sm};
    color: ${(props) => props.theme.colors.text.warning};
  }
`;

export default StyledWrapper;
