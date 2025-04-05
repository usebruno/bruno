import styled from 'styled-components';

const StyledWrapper = styled.div`
  font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif;

  .collection-info {
    margin-bottom: 1.5rem;
    transition: all 0.2s ease;

    &:hover {
      border-color: ${props => props.theme.input.focusBorder};
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }
  }

  .collection-name {
    color: ${props => props.theme.text};
    font-size: 0.875rem;
    font-weight: 600;
    letter-spacing: -0.01em;
    padding: 0;
  }

  .collection-path {
    color: ${props => props.theme.colors.text.muted};
    font-size: 0.75rem;
  }

  .checkbox-wrapper {
    margin: 1.25rem 0;

    label {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      color: ${props => props.theme.text};
      font-size: 0.8125rem;
      font-weight: 500;
      
      &:hover {
        cursor: pointer;
        color: ${props => props.theme.colors.text.danger};
      }
    }

    input[type="checkbox"] {
      appearance: none;
      width: 1rem;
      height: 1rem;
      border: 2px solid ${props => props.theme.input.border};
      border-radius: 0.25rem;
      transition: all 0.2s ease;
      position: relative;
      
      &:checked {
        border-color: ${props => props.theme.button.danger.bg};
        background-color: ${props => props.theme.button.danger.bg};

        &:after {
          content: '';
          position: absolute;
          left: 4px;
          top: 1px;
          width: 4px;
          height: 8px;
          border: solid white;
          border-width: 0 2px 2px 0;
          transform: rotate(45deg);
        }
      }

      &:hover {
        border-color: ${props => props.theme.button.danger.bg};
      }
    }
  }

  .confirm-input {
    animation: slideDown 0.2s ease;

    label {
      display: block;
      font-size: 0.75rem;
      margin-bottom: 0.5rem;
      color: ${props => props.theme.colors.text.muted};
      font-weight: 500;

      strong {
        color: ${props => props.theme.colors.text.danger};
        font-weight: 600;
      }
    }

    input {
      width: 100%;
      padding: 0.625rem;
      font-size: 0.8125rem;
      border-radius: 0.375rem;
      border: 1px solid ${props => props.theme.input.border};
      background: ${props => props.theme.input.bg};
      color: ${props => props.theme.text};
      transition: all 0.2s ease;

      &:focus {
        outline: none;
        border-color: ${props => props.theme.button.danger.bg};
        box-shadow: 0 0 0 3px ${props => props.theme.button.danger.bg}20;
      }
    }
  }

  .warning-message {
    margin-top: 1rem;
    padding: 0.75rem;
    border-radius: 0.375rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.75rem;
    font-weight: 500;
    background: ${props => props.theme.requestTabPanel.url.bg};
    color: ${props => props.theme.colors.text.muted};
    border: 1px solid transparent;
    transition: all 0.2s ease;

    &.danger {
      color: ${props => props.theme.colors.text.danger};
      background: ${props => props.theme.colors.text.danger}10;
      border-color: ${props => props.theme.colors.text.danger}20;
    }

    svg {
      flex-shrink: 0;
      stroke-width: 2.5;
    }
  }

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-0.5rem);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

export default StyledWrapper;
