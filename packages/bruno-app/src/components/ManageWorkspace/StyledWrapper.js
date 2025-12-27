import styled from 'styled-components';

const StyledWrapper = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;

  .manage-workspace-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border-bottom: 1px solid ${(props) => props.theme.workspace.border};
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .back-button {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 4px;
    cursor: pointer;
    color: ${(props) => props.theme.text};
  }

  .header-title {
    font-size: 15px;
    font-weight: 600;
    color: ${(props) => props.theme.text};
  }

  .create-workspace-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: ${(props) => props.theme.border.radius.base};
    background: ${(props) => props.theme.brand};
    color: white;
    font-size: ${(props) => props.theme.font.size.sm};
    font-weight: 500;
    cursor: pointer;
    border: none;
  }

  .workspace-list {
    flex: 1;
    overflow-y: auto;
    padding: 0 16px;
  }

  .workspace-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 0;
    border-bottom: 1px solid ${(props) => props.theme.workspace.border};
  }

  .workspace-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1;
    min-width: 0;
  }

  .workspace-name-row {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .workspace-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;

    &.default {
      color: ${(props) => props.theme.colors.text.muted};
    }

    &.regular {
      color: ${(props) => props.theme.brand};
    }
  }

  .workspace-name {
    font-size: ${(props) => props.theme.font.size.md};
    font-weight: 500;
    color: ${(props) => props.theme.text};
  }

  .default-badge {
    padding: 1px 6px;
    border-radius: ${(props) => props.theme.border.radius.sm};
    background: ${(props) => props.theme.background.surface1};
    color: ${(props) => props.theme.text};
    font-size: ${(props) => props.theme.font.size.xs};
  }

  .workspace-path {
    font-size: ${(props) => props.theme.font.size.xs};
    color: ${(props) => props.theme.text.muted};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .workspace-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .action-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    background: transparent;
    border: none;
    color: ${(props) => props.theme.text};
    font-size: ${(props) => props.theme.font.size.xs};
    cursor: pointer;
  }

  .more-actions-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 4px;
    background: transparent;
    border: none;
    color: ${(props) => props.theme.text};
    cursor: pointer;
  }

  .dropdown-menu {
    min-width: 120px;
  }

  .dropdown-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    cursor: pointer;
    color: ${(props) => props.theme.text};
    font-size: ${(props) => props.theme.font.size.sm};

    &.danger {
      color: ${(props) => props.theme.colors.text.danger};
    }
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 200px;
    color: ${(props) => props.theme.colors.text.muted};
    font-size: ${(props) => props.theme.font.size.sm};
  }
`;

export default StyledWrapper;
