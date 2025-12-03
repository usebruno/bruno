import styled from 'styled-components';

const StyledWrapper = styled.div`
  .workspace-header {
    position: relative;
  }

  .workspace-rename-container {
    height: 28px;
    display: flex;
    align-items: center;
    background: ${(props) => props.theme.sidebar.collection.item.hoverBg};
    gap: 8px;
    border-radius: 4px;
  }

  .workspace-name-input {
    padding: 0 8px;
    font-size: 18px;
    font-weight: 600;
    border-radius: 4px;
    background: transparent;
    color: ${(props) => props.theme.text.primary};
    outline: none;
    min-width: 200px;

    &:focus {
      outline: none;
    }
  }

  .inline-actions {
    display: flex;
    gap: 4px;
  }

  .inline-action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 4px;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;

    &.save {
      color: ${(props) => props.theme.colors.text.green};

      &:hover {
        background: ${(props) => props.theme.colors.bg.green};
      }
    }

    &.cancel {
      color: ${(props) => props.theme.colors.text.red};

      &:hover {
        background: ${(props) => props.theme.colors.bg.red};
      }
    }
  }

  .workspace-error {
    position: absolute;
    top: 100%;
    left: 16px;
    margin-top: 4px;
    font-size: 12px;
    color: ${(props) => props.theme.colors.text.red};
  }

  .workspace-menu-dropdown {
    min-width: 150px;
  }

  .dropdown-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    cursor: pointer;
    transition: background 0.2s;
    color: ${(props) => props.theme.text.primary};

    &.disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  .tabs-container {
    border-bottom: 1px solid ${(props) => props.theme.workspace.border};
    background: ${(props) => props.theme.bg.primary};
  }

  .tab-item {
    position: relative;
    cursor: pointer;
    color: var(--color-tab-inactive);
    border-bottom: 2px solid transparent;
    transition: all 0.15s ease;

    &:hover {
      color: ${(props) => props.theme.text.primary};
      border-bottom-color: ${(props) => props.theme.colors.border};
    }

    &.active {
      border-bottom-color: ${(props) => props.theme.colors.text.yellow};
      color: ${(props) => props.theme.tabs.active.color};
    }
  }

  .workspace-action-buttons {
    gap: 4px;
  }

  .workspace-button {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 4px 8px;
    font-size: 12px;
    border-radius: 8px;
    color: ${(props) => props.theme.text.primary};
    cursor: pointer;

    &:hover {
      background-color: ${(props) => props.theme.workspace.button.bg};
    }
  }
`;

export default StyledWrapper;
