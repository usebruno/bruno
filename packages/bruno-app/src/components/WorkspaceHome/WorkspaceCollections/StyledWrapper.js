import styled from 'styled-components';

const StyledWrapper = styled.div`
  .collections-table {
    display: flex;
    flex-direction: column;
    height: 100%;
    font-size: ${(props) => props.theme.font.size.base};
  }

  .collections-header {
    display: grid;
    gap: 16px;
    padding: 10px 16px;
    border-bottom: ${(props) => props.theme.workspace.collection.header.indentBorder};
    position: sticky;
    top: 0;
    z-index: 10;

    &:has(.header-git) {
      grid-template-columns: 1fr 3fr 1fr 1.5fr;
    }

    &:not(:has(.header-git)) {
      grid-template-columns: 1fr 3fr 1.5fr;
    }
  }

  .header-cell {
    font-weight: 600;
    font-size: ${(props) => props.theme.font.size.xs};
    color: ${(props) => props.theme.text.muted};
    text-transform: uppercase;
    letter-spacing: 0.5px;
    display: flex;
    align-items: center;
  }

  .collections-body {
    flex: 1;
    overflow-y: auto;
  }

  .collection-row {
    display: grid;
    gap: 16px;
    padding: 8px 16px;
    border-bottom: ${(props) => props.theme.workspace.collection.item.indentBorder};
    transition: background-color 0.15s ease;
    cursor: pointer;
    grid-template-columns: 1fr 3fr 1.5fr;

    &:hover {
      background-color: ${(props) => props.theme.sidebar.bg};
    }

    &:last-child {
      border-bottom: none;
    }
  }

  .row-cell {
    display: flex;
    align-items: center;
    overflow: hidden;
  }

  .cell-name {
    .collection-icon {
      color: ${(props) => props.theme.workspace.accent};
      flex-shrink: 0;
    }

    .collection-info {
      min-width: 0;
      flex: 1;
    }

    .collection-name {
      font-weight: 400;
      color: ${(props) => props.theme.text};
      font-size: ${(props) => props.theme.font.size.base};
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .collection-subtitle {
      font-size: ${(props) => props.theme.font.size.xs};
      color: ${(props) => props.theme.text.muted};
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-top: 2px;
    }
  }

  .cell-location {
    .location-text {
      font-size: ${(props) => props.theme.font.size.sm};
      color: ${(props) => props.theme.text.muted};
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      width: 100%;
    }
  }

  .cell-actions {
    justify-content: flex-end;
    
    .action-buttons {
      display: flex;
      gap: 4px;
    }
  }

  .action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border: none;
    background: transparent;
    border-radius: 5px;
    cursor: pointer;
    transition: background 0.15s ease, color 0.15s ease;
    color: ${(props) => props.theme.text.muted};

    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    &:hover:not(:disabled) {
      background-color: ${(props) => props.theme.listItem.hoverBg};
      
      &.action-edit {
        color: ${(props) => props.theme.text};
      }
      
      &.action-share {
        color: #3B82F6;
      }
      
      &.action-delete {
        color: #EF4444;
      }
    }
  }
`;

export default StyledWrapper;
