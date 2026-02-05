import styled from 'styled-components';

const StyledWrapper = styled.div`
  color: ${(props) => props.theme.text};

  .cache-stats {
    padding: 1rem;
    border-radius: ${(props) => props.theme.border.radius.md};
    background-color: ${(props) => props.theme.input.bg};
    border: 1px solid ${(props) => props.theme.input.border};
    margin-bottom: 1rem;
  }

  .stat-item {
    display: flex;
    justify-content: space-between;
    padding: 0.5rem 0;
    border-bottom: 1px solid ${(props) => props.theme.input.border};

    &:last-child {
      border-bottom: none;
    }
  }

  .stat-label {
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.colors.text.muted};
  }

  .stat-value {
    font-size: ${(props) => props.theme.font.size.sm};
    font-weight: 500;
  }

  .purge-button {
    padding: 0.5rem 1rem;
    border-radius: ${(props) => props.theme.border.radius.sm};
    font-size: ${(props) => props.theme.font.size.sm};
    cursor: pointer;
    background-color: ${(props) => props.theme.input.bg};
    border: 1px solid ${(props) => props.theme.input.border};
    color: ${(props) => props.theme.text};

    &:hover:not(:disabled) {
      border-color: ${(props) => props.theme.input.focusBorder};
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  .description {
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.colors.text.muted};
    margin-top: 0.5rem;
  }

  .section-title {
    font-weight: 600;
    font-size: 0.875rem;
    margin-bottom: 0.75rem;
  }
`;

export default StyledWrapper;
