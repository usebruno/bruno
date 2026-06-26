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
      max-width: 124px;
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

  .workspace-input-wrapper {
    display: flex;
    align-items: center;
    border: 1px solid ${(props) => props.theme.input.border};
    border-radius: 3px;
    background: ${(props) => props.theme.input.bg};
    min-width: 150px;

    &:focus-within {
      border-color: ${(props) => props.theme.input.focusBorder};
    }
  }

  .workspace-name-input {
    font-size: 14px;
    font-weight: 500;
    padding: 2px 6px;
    border: none;
    background: transparent;
    color: ${(props) => props.theme.text};
    outline: none;
    flex: 1;
    min-width: 0;
  }

  .cog-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 22px;
    height: 100%;
    border: none;
    cursor: pointer;
    background: transparent;
    color: ${(props) => props.theme.text};
    opacity: 0.5;

    &:hover {
      opacity: 1;
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

  .migrate-yml-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 2px 4px 2px 8px;
    border: 1px solid ${(props) => props.theme.input.border};
    border-radius: 999px;
    background: transparent;
    color: ${(props) => props.theme.text};
    font-size: 12px;
    line-height: 1;
    transition: background-color 0.15s ease;

    &:hover {
      background: ${(props) => props.theme.sidebar.collection.item.hoverBg};
    }

    .pill-main {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 0;
      border: none;
      background: transparent;
      color: inherit;
      font: inherit;
      cursor: pointer;
    }

    .pill-label {
      font-weight: 500;
    }

    .pill-dismiss {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 16px;
      height: 16px;
      padding: 0;
      border: none;
      border-radius: 50%;
      background: transparent;
      color: inherit;
      cursor: pointer;
      opacity: 0.6;
      transition: opacity 0.15s ease, background-color 0.15s ease;

      &:hover {
        opacity: 1;
        background: ${(props) => props.theme.sidebar.collection.item.hoverBg};
      }
    }
  }

  .display-icon{
    padding: 4px;
    box-sizing: content-box;
    &:hover {
      background: ${(props) => props.theme.sidebar.collection.item.hoverBg};
      border-radius: ${(props) => props.theme.border.radius.sm}
    }
  }

  .mode-toggle {
    display: inline-flex;
    align-items: stretch;
    padding: 2px;
    gap: 2px;
    background: ${(props) => props.theme.sidebar.collection.item.hoverBg};
    border-radius: ${(props) => props.theme.border.radius.base};

    .mode-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 26px;
      padding: 0;
      border: 1px solid transparent;
      background: transparent;
      color: ${(props) => props.theme.colors.text.muted};
      border-radius: ${(props) => props.theme.border.radius.sm};
      cursor: pointer;
      transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;

      &:hover:not(.active) {
        color: ${(props) => props.theme.text};
      }

      &.active {
        background: ${(props) => props.theme.bg};
        color: ${(props) => props.theme.text};
        border-color: ${(props) => props.theme.input.border};
        box-shadow: ${(props) => props.theme.shadow.sm};
      }
    }
  }
`;

export default StyledWrapper;
