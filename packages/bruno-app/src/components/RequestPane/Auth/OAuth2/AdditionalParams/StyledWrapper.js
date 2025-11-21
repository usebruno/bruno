import styled from 'styled-components';

const Wrapper = styled.div`
  /* Tabs container for Additional Parameters */
  .tabs-container {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }

  .tab {
    padding: 0.5rem 1rem;
    font-size: 0.8125rem;
    font-weight: 500;
    color: ${(props) => props.theme.text || '#202223'};
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    cursor: pointer;
    transition: all 150ms ease;

    &:hover {
      color: ${(props) => props.theme.brand || '#0052CC'};
      background: ${(props) => props.theme.table?.row?.hoverBg || '#F6F6F7'};
      border-radius: 6px 6px 0 0;
    }

    &.active {
      color: ${(props) => props.theme.brand || '#0052CC'};
      border-bottom-color: ${(props) => props.theme.brand || '#0052CC'};
      font-weight: 600;
    }
  }

  /* Button action styling */
  .btn-action {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    margin-top: 0.75rem;
    font-size: 0.8125rem;
    font-weight: 500;
    color: ${(props) => props.theme.textLink || '#1663bb'};
    background: none;
    border: none;
    cursor: pointer;
    transition: color 150ms ease;

    &:hover:not(:disabled) {
      color: ${(props) => props.theme.brand || '#546de5'};

      span {
        text-decoration: underline;
      }
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    svg {
      flex-shrink: 0;
    }
  }
`;

export default Wrapper;
