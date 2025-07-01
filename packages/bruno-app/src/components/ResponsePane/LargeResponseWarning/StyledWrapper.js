import styled from 'styled-components';

const StyledWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;

  .warning-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 1.5rem;
    margin-top: 10%;
    text-align: center;
    max-width: 480px;
  }

  .warning-icon {
    margin-bottom: 1rem;
    color: ${(props) => props.theme.colors.text.yellow};
  }

  .warning-title {
    font-weight: 600;
    color: ${(props) => props.theme.text};
    margin-bottom: 1rem;
  }

  .warning-description {
    color: ${(props) => props.theme.colors.text.muted};

    .size-highlight {
      padding: 0.125rem 0.375rem;
      border-radius: 4px;
      font-size: 0.8rem;
    }

    .current-size {
      color: ${(props) => props.theme.colors.text.danger};
      background: ${(props) => props.theme.colors.text.danger}15;
    }

    .supported-size {
      color: ${(props) => props.theme.colors.text.yellow};
      background: ${(props) => props.theme.colors.text.yellow}15;
    }
  }

  .warning-actions {
    display: flex;
    gap: 0.75rem;
  }

  button {
    align-items: center;
    display: flex;
    gap: 0.5rem;
    background: ${(props) => props.theme.button.secondary.bg};
    border-radius: 4px;
    padding: 0.5rem 1rem;
    cursor: pointer;
  }
`;

export default StyledWrapper;
