import styled from 'styled-components';

const StyledWrapper = styled.div`
  .inline-warning-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    padding: 0.25rem 0.75rem;
    border: 1px solid ${(props) => props.theme.status.warning.border};
    background: ${(props) => props.theme.status.warning.background};
    border-radius: 4px;
    font-size: 0.75rem;
    margin-bottom: 0.5rem;
  }

  .inline-warning-content {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    min-width: 0;
    color: ${(props) => props.theme.status.warning.text};
  }

  .inline-warning-icon {
    flex-shrink: 0;
  }

  .inline-warning-text {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .inline-warning-dismiss {
    color: ${(props) => props.theme.status.warning.text};
    padding: 2px;
    background: none;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    flex-shrink: 0;

    &:hover {
      opacity: 0.7;
    }
  }
`;

export default StyledWrapper;
