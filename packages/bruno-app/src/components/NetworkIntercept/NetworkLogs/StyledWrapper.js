import styled from 'styled-components';

const StyledWrapper = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;

  .logs-toolbar {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.5rem 1rem;
    background-color: ${(props) => props.theme.background.mantle};
    border-bottom: 1px solid ${(props) => props.theme.border.border0};

    .search-wrapper {
      flex: 1;
      max-width: 400px;
      
      .search-input {
        width: 100%;
        padding: 0.4rem 0.75rem;
        background-color: ${(props) => props.theme.background.base};
        border: 1px solid ${(props) => props.theme.border.border1};
        border-radius: ${(props) => props.theme.border.radius.sm};
        color: ${(props) => props.theme.text};
        font-size: ${(props) => props.theme.font.size.sm};

        &:focus {
          outline: none;
          border-color: ${(props) => props.theme.accents.primary};
        }
      }
    }

    .filter-group {
      display: flex;
      gap: 0.35rem;

      .filter-btn {
        padding: 0.2rem 0.6rem;
        background: none;
        border: 1px solid ${(props) => props.theme.border.border1};
        border-radius: ${(props) => props.theme.border.radius.sm};
        color: ${(props) => props.theme.colors.text.muted};
        font-size: 11px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;

        &:hover {
          background-color: ${(props) => props.theme.background.surface0};
          color: ${(props) => props.theme.text};
        }

        &.active {
          color: #ffffff;
          
          &.GET {
            background-color: ${(props) => props.theme.request.methods.get};
            border-color: ${(props) => props.theme.request.methods.get};
          }
          &.POST {
            background-color: ${(props) => props.theme.request.methods.post};
            border-color: ${(props) => props.theme.request.methods.post};
          }
          &.PUT {
            background-color: ${(props) => props.theme.request.methods.put};
            border-color: ${(props) => props.theme.request.methods.put};
          }
          &.DELETE {
            background-color: ${(props) => props.theme.request.methods.delete};
            border-color: ${(props) => props.theme.request.methods.delete};
          }
          &.PATCH {
            background-color: ${(props) => props.theme.request.methods.patch};
            border-color: ${(props) => props.theme.request.methods.patch};
          }
        }
      }
    }

    .request-count {
      margin-left: auto;
      font-size: 11px;
      color: ${(props) => props.theme.colors.text.muted};
    }
  }

  .logs-table-container {
    flex: 1;
    overflow: auto;
    background-color: ${(props) => props.theme.background.base};
  }

  .logs-table {
    width: 100%;
    border-collapse: collapse;
    font-size: ${(props) => props.theme.font.size.sm};

    thead {
      position: sticky;
      top: 0;
      z-index: 10;
      background-color: ${(props) => props.theme.background.mantle};
      border-bottom: 1px solid ${(props) => props.theme.border.border1};

      th {
        padding: 0.6rem 0.75rem;
        text-align: left;
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        color: ${(props) => props.theme.colors.text.muted};
        letter-spacing: 0.05em;
      }
    }

    tbody {
      tr {
        border-bottom: 1px solid ${(props) => props.theme.border.border0};
        cursor: pointer;
        transition: background-color 0.1s;

        &:hover {
          background-color: ${(props) => props.theme.background.surface0};
        }

        &.selected {
          background-color: ${(props) => props.theme.background.surface1};
        }

        &.pending {
          opacity: 0.6;
        }
      }

      td {
        padding: 0.5rem 0.75rem;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        color: ${(props) => props.theme.text};
      }
    }
  }

  .method-badge {
    display: inline-block;
    padding: 0.15rem 0.4rem;
    border-radius: 3px;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    color: white;
    min-width: 48px;
    text-align: center;

    &.GET { background-color: ${(props) => props.theme.request.methods.get}; }
    &.POST { background-color: ${(props) => props.theme.request.methods.post}; }
    &.PUT { background-color: ${(props) => props.theme.request.methods.put}; }
    &.DELETE { background-color: ${(props) => props.theme.request.methods.delete}; }
    &.PATCH { background-color: ${(props) => props.theme.request.methods.patch}; }
  }

  .status-badge {
    font-weight: 600;
    &.status-2xx { color: ${(props) => props.theme.requestTabPanel.responseOk}; }
    &.status-3xx { color: ${(props) => props.theme.request.methods.put}; }
    &.status-4xx { color: ${(props) => props.theme.requestTabPanel.responseError}; }
    &.status-5xx { color: ${(props) => props.theme.requestTabPanel.responseError}; }
    &.status-pending { color: ${(props) => props.theme.colors.text.muted}; }
  }

  .url-cell {
    max-width: 0;
    width: 100%;
    
    .url-host {
      font-weight: 500;
      margin-right: 0.5rem;
    }
    
    .url-path {
      color: ${(props) => props.theme.colors.text.muted};
    }
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: ${(props) => props.theme.colors.text.muted};
    padding: 2rem;

    .empty-icon {
      font-size: 3rem;
      margin-bottom: 1rem;
      opacity: 0.3;
    }

    .empty-title {
      font-size: 1.1rem;
      font-weight: 600;
      color: ${(props) => props.theme.text};
      margin-bottom: 0.5rem;
    }

    .empty-description {
      font-size: ${(props) => props.theme.font.size.sm};
      line-height: 1.5;
      max-width: 400px;
      text-align: center;
    }
  }
`;

export default StyledWrapper;
