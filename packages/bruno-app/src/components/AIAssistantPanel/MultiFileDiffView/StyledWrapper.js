import styled from 'styled-components';

const StyledWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;

  .file-tabs {
    display: flex;
    gap: 4px;
    overflow-x: auto;
    padding-bottom: 4px;

    &::-webkit-scrollbar {
      height: 4px;
    }

    &::-webkit-scrollbar-thumb {
      background: ${(props) => props.theme.scrollbar.color};
      border-radius: 2px;
    }
  }

  .file-tab {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    background: ${(props) => props.theme.sidebar.collection.item.bg};
    border: 1px solid transparent;
    border-radius: ${(props) => props.theme.border.radius.sm};
    cursor: pointer;
    flex-shrink: 0;
    transition: all 0.15s ease;
    font-size: ${(props) => props.theme.font.size.xs};

    &:hover {
      background: ${(props) => props.theme.sidebar.collection.item.hoverBg};
    }

    &.active {
      border-color: ${(props) => props.theme.brand};
      background: ${(props) => props.theme.sidebar.collection.item.hoverBg};
    }

    &.accepted {
      border-color: ${(props) => props.theme.colors.text.green};
    }

    &.rejected {
      border-color: ${(props) => props.theme.colors.text.red || '#f85149'};
      opacity: 0.6;
    }

    .method-badge {
      font-size: 9px;
      font-weight: 600;
      text-transform: uppercase;
      padding: 2px 4px;
      border-radius: 3px;

      &.get { color: ${(props) => props.theme.request.methods.get}; }
      &.post { color: ${(props) => props.theme.request.methods.post}; }
      &.put { color: ${(props) => props.theme.request.methods.put}; }
      &.delete { color: ${(props) => props.theme.request.methods.delete}; }
      &.patch { color: ${(props) => props.theme.request.methods.patch}; }
    }

    .file-name {
      color: ${(props) => props.theme.colors.text.primary};
      max-width: 100px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .script-type {
      font-size: 9px;
      padding: 1px 4px;
      background: ${(props) => props.theme.brand};
      color: white;
      border-radius: 3px;
      text-transform: uppercase;
    }

    .status-icon {
      width: 14px;
      height: 14px;
      display: flex;
      align-items: center;
      justify-content: center;

      &.accepted { color: ${(props) => props.theme.colors.text.green}; }
      &.rejected { color: ${(props) => props.theme.colors.text.red || '#f85149'}; }
    }
  }

  .diff-header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.colors.text.primary};

    .file-info {
      display: flex;
      align-items: center;
      gap: 6px;
      flex: 1;

      .method {
        font-size: 10px;
        font-weight: 600;
        text-transform: uppercase;
      }

      .name {
        font-weight: 500;
      }

      .script-badge {
        font-size: 9px;
        padding: 2px 6px;
        background: ${(props) => props.theme.brand};
        color: white;
        border-radius: 3px;
        text-transform: uppercase;
      }
    }
  }

  .diff-container {
    border-radius: ${(props) => props.theme.border.radius.base};
    overflow: hidden;
  }

  .actions {
    display: flex;
    flex-direction: column;
    gap: 8px;

    .individual-actions {
      display: flex;
      gap: 8px;

      > div {
        flex: 1;
      }
    }

    .bulk-actions {
      display: flex;
      justify-content: space-between;
      padding-top: 8px;
      border-top: 1px solid ${(props) => props.theme.sidebar.dragbar.border};
    }
  }

  .progress {
    text-align: center;
    font-size: ${(props) => props.theme.font.size.xs};
    color: ${(props) => props.theme.colors.text.muted};
    padding: 4px 0;
  }

  .completed-message {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 20px;
    text-align: center;

    .icon {
      color: ${(props) => props.theme.colors.text.green};
    }

    .text {
      font-size: ${(props) => props.theme.font.size.sm};
      color: ${(props) => props.theme.colors.text.primary};
    }

    .details {
      font-size: ${(props) => props.theme.font.size.xs};
      color: ${(props) => props.theme.colors.text.muted};
    }
  }
`;

export default StyledWrapper;
