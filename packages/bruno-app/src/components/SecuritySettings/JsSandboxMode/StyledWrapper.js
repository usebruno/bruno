import styled from 'styled-components';

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
    background-color: ${(props) => props.theme.app.collection.toolbar.sandboxMode.safeMode.bg};
    color: ${(props) => props.theme.app.collection.toolbar.sandboxMode.safeMode.color};
  }

  .developer-mode {
    background-color: ${(props) => props.theme.app.collection.toolbar.sandboxMode.developerMode.bg};
    color: ${(props) => props.theme.app.collection.toolbar.sandboxMode.developerMode.color};
  }

  .sandbox-dropdown {
    min-width: 260px;
    max-width: 400px;
  }

  .sandbox-header {
    padding: 0.5rem 0.625rem;
    font-size: 0.875rem;
    color: ${(props) => props.theme.dropdown.headingText};
  }

  .sandbox-option {
    display: flex;
    margin: 5px;
    border-radius: 8px;
    padding: 12px;
    align-items: flex-start;
    text-align: left;
    font-size: 0.75rem;
    gap: 0.5rem;
    position: relative;

    &.active {
      &.developer-mode {
        border: 1px solid ${(props) => props.theme.app.collection.toolbar.sandboxMode.developerMode.border};
      }

      &.safe-mode {
        border: 1px solid ${(props) => props.theme.app.collection.toolbar.sandboxMode.safeMode.border};
      }
    }

    svg {
      width: 2rem;
    }
  }

  .recommended-badge {
    padding: 0.125rem 0.5rem;
    font-size: 0.75rem;
    font-weight: 500;
    background-color: rgba(16, 185, 129, 0.2);
    color: ${(props) => props.theme.app.collection.toolbar.sandboxMode.safeMode.color};
    border-radius: 9999px;
  }

  .sandbox-option-title {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.875rem;
    line-height: 1.25rem;
  }

  .sandbox-option-description {
    font-size: 0.75rem;
    color: ${(props) => props.theme.colors.text.muted};
    line-height: 1.1rem;
    margin-top: 0.25rem;
  }

  .developer-mode-warning {
    margin: 0.5rem 0;
    padding: 0.25rem 0.5rem;
    background-color: rgba(245, 158, 11, 0.1);
    border: 1px solid rgba(245, 158, 11, 0.2);
    border-radius: 0.25rem;
    color: #fbbf24;
  }

  .sandbox-dropdown-footer {
    font-size: 0.75rem;
    padding: 0.75rem;
  }
  
  .sandbox-dropdown-footer-text {
    color: ${(props) => props.theme.colors.text.muted};
    text-align: center;
  }
`;

export default StyledWrapper;
