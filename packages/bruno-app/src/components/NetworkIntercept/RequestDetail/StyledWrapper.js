import styled from 'styled-components';

const StyledWrapper = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: ${(props) => props.theme.background.mantle};

  .detail-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid ${(props) => props.theme.border.border0};

    .detail-title {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      min-width: 0;
      flex: 1;

      .url-text {
        font-size: ${(props) => props.theme.font.size.sm};
        font-weight: 500;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    }

    .detail-actions {
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }
  }

  .detail-tabs {
    display: flex;
    padding: 0 1rem;
    background-color: ${(props) => props.theme.background.mantle};
    border-bottom: 1px solid ${(props) => props.theme.border.border0};

    .tab {
      padding: 0.6rem 0.75rem;
      font-size: ${(props) => props.theme.font.size.sm};
      cursor: pointer;
      color: ${(props) => props.theme.tabs.secondary.inactive.color};
      border-bottom: 2px solid transparent;
      margin-right: 0.5rem;

      &:hover {
        color: ${(props) => props.theme.text};
      }

      &.active {
        color: ${(props) => props.theme.text};
        border-bottom-color: ${(props) => props.theme.tabs.active.border};
      }
    }
  }

  .detail-content {
    flex: 1;
    overflow: auto;
    padding: 1rem;

    .section {
      margin-bottom: 1.5rem;
      
      .section-title {
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        color: ${(props) => props.theme.colors.text.muted};
        margin-bottom: 0.75rem;
        letter-spacing: 0.05em;
      }
    }
  }

  .info-grid {
    display: grid;
    grid-template-columns: 100px 1fr;
    gap: 0.5rem 1rem;
    font-size: ${(props) => props.theme.font.size.sm};

    .info-label {
      color: ${(props) => props.theme.colors.text.muted};
    }

    .info-value {
      color: ${(props) => props.theme.text};
      word-break: break-all;
    }
  }

  .body-content {
    background-color: ${(props) => props.theme.background.base};
    padding: 0.75rem;
    border-radius: ${(props) => props.theme.border.radius.sm};
    border: 1px solid ${(props) => props.theme.border.border0};
    font-family: 'JetBrains Mono', 'Fira Code', monospace;
    font-size: ${(props) => props.theme.font.size.sm};
    white-space: pre-wrap;
    word-break: break-all;
    max-height: 400px;
    overflow: auto;

    &.empty {
      color: ${(props) => props.theme.colors.text.muted};
      font-style: italic;
    }
  }

  .headers-table {
    width: 100%;
    border-collapse: collapse;
    font-size: ${(props) => props.theme.font.size.sm};
    background-color: ${(props) => props.theme.background.base};
    border: 1px solid ${(props) => props.theme.border.border0};
    border-radius: ${(props) => props.theme.border.radius.sm};

    td, th {
      padding: 0.4rem 0.75rem;
      text-align: left;
      border-bottom: 1px solid ${(props) => props.theme.border.border0};
    }

    tr:last-child td {
      border-bottom: none;
    }

    .header-name {
      color: ${(props) => props.theme.colors.text.muted};
      width: 150px;
      font-weight: 500;
    }
  }

  .method-badge {
    display: inline-block;
    padding: 0.2rem 0.5rem;
    border-radius: 3px;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    color: white;

    &.GET { background-color: ${(props) => props.theme.request.methods.get}; }
    &.POST { background-color: ${(props) => props.theme.request.methods.post}; }
    &.PUT { background-color: ${(props) => props.theme.request.methods.put}; }
    &.DELETE { background-color: ${(props) => props.theme.request.methods.delete}; }
    &.PATCH { background-color: ${(props) => props.theme.request.methods.patch}; }
  }

  .status-success { color: ${(props) => props.theme.requestTabPanel.responseOk}; font-weight: 500; }
  .status-error { color: ${(props) => props.theme.requestTabPanel.responseError}; font-weight: 500; }
  .status-redirect { color: ${(props) => props.theme.request.methods.put}; font-weight: 500; }

  .empty-detail {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: ${(props) => props.theme.colors.text.muted};

    .empty-icon {
      margin-bottom: 1rem;
      opacity: 0.3;
      color: ${(props) => props.theme.colors.text.muted};

      svg {
        display: block;
      }
    }
  }
`;

export default StyledWrapper;
