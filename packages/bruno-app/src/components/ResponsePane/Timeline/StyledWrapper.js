import styled from 'styled-components';

const StyledWrapper = styled.div`
  position: relative;

  .timeline-container {
    scrollbar-width: none; /* Firefox */
    &::-webkit-scrollbar {
      display: none; /* Chrome, Safari, Edge */
    }
  }

  .timeline-event {
    padding: 8px 0 0 0;
    cursor: pointer;
  }

  .timeline-event-content {
    border-radius: 4px;
    padding: 12px;
    margin-top: 0.5rem;
  }

  .timeline-event-header {
    color: ${(props) => props.theme.text};
  }

  .method-label {
    font-weight: 600;
  }

  .status-code {
    font-weight: 600;
  }

  .url-text {
    color: ${(props) => props.theme.colors.text.muted};
    font-size: 0.875rem;
    margin-top: 0.25rem;
  }

  .timestamp {
    color: ${(props) => props.theme.colors.text.muted};
    font-size: 0.875rem;
  }

  .meta-info {
    color: ${(props) => props.theme.colors.text.muted};
    font-size: 0.875rem;
  }

  .oauth-section {
    .oauth-header {
      display: flex;
      align-items: center;
      color: ${(props) => props.theme.text};
      font-weight: 600;

      span {
        margin-left: 0.5rem;
      }
    }
  }

  .tabs-switcher {
    border-bottom: 1px solid ${(props) => props.theme.modal.input.border};
    margin-bottom: 16px;
    
    button {
      position: relative;
      padding: 8px 16px;
      color: ${(props) => props.theme.colors.text.muted};

      &.active {
        color: ${(props) => props.theme.tabs.active.color};
        &:after {
          content: '';
          position: absolute;
          bottom: -1px;
          left: 0;
          right: 0;
          height: 2px;
          background: ${(props) => props.theme.tabs.active.border};
        }
      }
    }
  }

  .network-logs {
    background: ${(props) => props.theme.codemirror.bg};
    color: ${(props) => props.theme.text};
    border-radius: 4px;
  }

  .oauth-request-item-content {
    border-radius: 4px;
    margin-top: 0.5rem;
  }

  .collapsible-section {
    margin-bottom: 12px;

    .section-header {
      cursor: pointer;
      &:hover {
        opacity: 0.8;
      }
    }
  }

  .line {
    white-space: pre-line;
    word-wrap: break-word;
    word-break: break-all;
    font-family: ${(props) => props.theme.font || 'Inter, sans-serif'} !important;

    .arrow {
      opacity: 0.5;
    }

    &.request {
      color: ${(props) => props.theme.colors.text.green};
    }

    &.response {
      color: ${(props) => props.theme.colors.text.purple};
    }
  }
    
  .request-label {
    font-size: 0.75rem;
    padding: 2px 6px;
    border-radius: 3px;
    margin-left: 8px;
    background: ${(props) => props.theme.requestTabs.bg};
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-weight: 600;
    table-layout: fixed;

    thead,
    td {
      border: 1px solid ${(props) => props.theme.table.border};
    }

    thead {
      color: ${(props) => props.theme.table.thead.color};
      font-size: 0.8125rem;
      user-select: none;
    }
    td {
      padding: 6px 10px;
    }
  }
`;

export default StyledWrapper;
