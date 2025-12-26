import styled from 'styled-components';

const StyledWrapper = styled.div`
  color: ${(props) => props.theme.text};

  .integrations-header {
    margin-bottom: 1rem;
  }

  .integrations-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .integration-item {
    border: 1px solid ${(props) => props.theme.border};
    border-radius: 10px;
    padding: 0.75rem 1rem;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    background: ${(props) => props.theme.backgroundLight || 'transparent'};
  }

  .integration-copy {
    max-width: 70%;
  }

  .integration-name {
    font-weight: 600;
    margin-bottom: 0.25rem;
  }

  .integration-description {
    color: ${(props) => props.theme.mutedText || '#6b7280'};
    font-size: 0.9rem;
  }

  .integration-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .integration-toggle {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    font-weight: 500;
  }

  .integrations-empty {
    border: 1px dashed ${(props) => props.theme.border};
    border-radius: 10px;
    padding: 1rem;
    text-align: center;
    color: ${(props) => props.theme.mutedText || '#6b7280'};
  }
`;

export default StyledWrapper;
