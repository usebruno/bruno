import styled from 'styled-components';

const StyledWrapper = styled.div`
  /* Environment item styling */
  .environment-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    padding: 0.375rem 0.5rem;
    border-radius: 0.25rem;
    transition: background-color 0.15s ease;

    .environment-name {
      color: ${(props) => props.theme.text};
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      flex: 1;
    }
  }

  .inheritance-warning {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    margin: 0 0.5rem 0.25rem 1.75rem;
    color: ${(props) => props.theme.status.warning.text};
    font-size: ${(props) => props.theme.font.size.sm};

    .warning-icon {
      flex-shrink: 0;
    }

    .inherited-name {
      font-weight: 600;
      word-break: break-all;
    }
  }
`;

export default StyledWrapper;
