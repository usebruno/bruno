import styled from 'styled-components';

const StyledWrapper = styled.div`
  .collection-switcher {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .switcher-trigger {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 8px;
    border: none;
    border-radius: 4px;
    background: transparent;
    color: ${(props) => props.theme.text};
    cursor: pointer;
    font-weight: 500;
    transition: background-color 0.15s ease;

    &:hover {
      background: ${(props) => props.theme.sidebar.collection.item.hoverBg};
    }

    .switcher-name {
      max-width: 300px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;

      &.scratch-collection {
        font-weight: 600;
        font-size: 15px;
      }
    }

    .tab-count {
      font-size: 11px;
      font-weight: 500;
      padding: 1px 6px;
      border-radius: 10px;
      background: ${(props) => props.theme.sidebar.collection.item.hoverBg};
      min-width: 18px;
      text-align: center;
    }

    .chevron {
      opacity: 0.6;
      flex-shrink: 0;
    }
  }

  .workspace-actions-trigger {
    cursor: pointer;
    opacity: 0.6;
    padding: 4px;
    border-radius: 4px;
    transition: opacity 0.15s ease, background-color 0.15s ease;

    &:hover {
      opacity: 1;
      background: ${(props) => props.theme.sidebar.collection.item.hoverBg};
    }
  }

  .workspace-rename-container {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 8px;
  }

  .workspace-name-input {
    font-size: 14px;
    font-weight: 500;
    padding: 2px 6px;
    border: 1px solid ${(props) => props.theme.input.border};
    border-radius: 3px;
    background: ${(props) => props.theme.input.bg};
    color: ${(props) => props.theme.text};
    outline: none;
    min-width: 150px;

    &:focus {
      border-color: ${(props) => props.theme.input.focusBorder};
    }
  }

  .inline-actions {
    display: flex;
    align-items: center;
    gap: 2px;
  }

  .inline-action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border: none;
    border-radius: 3px;
    cursor: pointer;
    background: transparent;
    color: ${(props) => props.theme.text};

    &:hover {
      background: ${(props) => props.theme.sidebar.collection.item.hoverBg};
    }

    &.save {
      color: ${(props) => props.theme.colors.text.green};
    }

    &.cancel {
      color: ${(props) => props.theme.colors.text.danger};
    }
  }

  .workspace-error {
    font-size: 12px;
    color: ${(props) => props.theme.colors.text.danger};
    margin-left: 8px;
  }
`;

export default StyledWrapper;
