import styled from 'styled-components';

const StyledWrapper = styled.div`
  width: 100%;

  .actions {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    gap: 10px;
    margin-bottom: 16px;
    width: 100%;
  }

  .actions-toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
    width: 100%;
  }

  .create-panel {
    flex: 0 0 auto;
    width: auto;
  }

  .create-panel.expanded {
    flex: 1 1 100%;
    width: 100%;
  }

  .response-list {
    width: 100%;
    border: 1px solid ${(props) => props.theme.table.border};
    border-radius: ${(props) => props.theme.border.radius.sm};
    overflow: hidden;
  }

  .response-item {
    width: 100%;
    display: flex;
    align-items: flex-start;
    gap: 8px;
    text-align: left;
    padding: 12px 12px 12px 16px;
    border-bottom: 1px solid ${(props) => props.theme.table.border};
    background: transparent;
    color: inherit;
    cursor: pointer;
    transition: background 0.15s;

    &:last-child {
      border-bottom: none;
    }

    &:hover {
      background: ${(props) => props.theme.bg.hover || props.theme.sidebar.collection.item.hoverBg};

      .response-item-delete {
        opacity: 1;
      }
    }
  }

  .response-item-body {
    flex: 1;
    min-width: 0;
  }

  .response-item-delete {
    flex-shrink: 0;
    opacity: 0.55;
    margin-top: 2px;
    transition: opacity 0.15s;

    &:hover {
      opacity: 1;
    }
  }

  .response-item-header {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }

  .response-item-icon {
    color: ${(props) => props.theme.requestTabs?.special?.iconColor || props.theme.text};
    flex-shrink: 0;
    opacity: 0.85;
  }

  .response-item-name {
    font-weight: 500;
    font-size: 0.875rem;
    min-width: 0;
  }
`;

export default StyledWrapper;
