import styled from 'styled-components';
import iconInputStyles from '../../components/IconInputStyles';
import spinnerStyles from '../../components/SpinnerStyles';

const StyledWrapper = styled.div`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.25rem 1.25rem 0.75rem;
  overflow-y: auto;

  .import-text-field {
    ${iconInputStyles}

    input {
      border-color: ${(props) => props.theme.border.border0};

      &:focus {
        border-color: ${(props) => props.theme.input.focusBorder};
      }
    }
  }

  .import-text-status {
    position: absolute;
    top: 0.5625rem;
    right: 0.625rem;
    display: flex;
    color: ${(props) => props.theme.colors.text.muted};
  }

  .import-text-spinner {
    ${spinnerStyles}
  }

  .import-zip-warning {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    padding: 0.5625rem 0.75rem;
    border-radius: ${(props) => props.theme.border.radius.base};
    background: ${(props) => props.theme.status.warning.background};
    font-size: ${(props) => props.theme.font.size.base};
    line-height: 1.5;
    overflow-wrap: anywhere;

    > svg {
      flex: none;
      margin-top: 0.1875rem;
      color: ${(props) => props.theme.status.warning.text};
    }
  }

  .import-enter-hint {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.colors.text.muted};

    kbd {
      padding: 0 0.3125rem;
      border-radius: ${(props) => props.theme.border.radius.sm};
      background: ${(props) => props.theme.background.surface1};
      font-family: var(--font-family-mono);
      font-size: ${(props) => props.theme.font.size.xs};
      line-height: 1.125rem;
    }
  }

  .import-docs-links {
    flex: none;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
  }

  .import-docs-link {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    margin: -0.25rem -0.375rem;
    padding: 0.25rem 0.375rem;
    border-radius: ${(props) => props.theme.border.radius.sm};
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.colors.text.muted};
    text-underline-offset: 0.125rem;

    &:hover {
      color: ${(props) => props.theme.textLink};
      text-decoration: underline;
    }

    &:focus-visible {
      outline: 0.125rem solid ${(props) => props.theme.colors.text.muted};
    }
  }
`;

export default StyledWrapper;
