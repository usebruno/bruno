import styled from 'styled-components';

const Wrapper = styled.div`
  height: 36px;
  display: flex;
  align-items: center;
  background: ${(props) => props.theme.sidebar.bg};
  border-bottom: 1px solid ${(props) => props.theme.sidebar.collection.item.hoverBg};
  -webkit-app-region: drag;
  user-select: none;

  .titlebar-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    height: 100%;
    padding: 0 12px;
    padding-left: 70px; /* Space for macOS window controls */
    transition: padding-left 0.15s ease;
  }

  /* When in full screen, no traffic lights so reduce padding */
  &.fullscreen .titlebar-content {
    padding-left: 4px;
  }

  /* Remove drag region from interactive elements */
  .workspace-name-container,
  .dropdown-item,
  .home-button,
  .env-selector-trigger,
  .dropdown,
  button {
    -webkit-app-region: no-drag;
  }

  /* Left section */
  .titlebar-left {
    display: flex;
    align-items: center;
    flex-shrink: 0;
    margin-left: 10px;
    -webkit-app-region: no-drag;
  }

  /* When in full screen, no traffic lights so remove margin-left */
  &.fullscreen .titlebar-left {
    margin-left: 0px;
  }

  /* Home button */
  .home-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border: none;
    background: transparent;
    border-radius: 6px;
    cursor: pointer;
    color: ${(props) => props.theme.sidebar.color};
    transition: background 0.15s ease;

    &:hover {
      background: ${(props) => props.theme.sidebar.collection.item.hoverBg};
    }
  }

  /* Workspace Name Dropdown Trigger */
  .workspace-name-container {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 5px 10px;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover {
      background: ${(props) => props.theme.sidebar.collection.item.hoverBg};
    }

    .workspace-name {
      font-size: 13px;
      font-weight: 500;
      color: ${(props) => props.theme.sidebar.color};
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 180px;
    }

    .chevron-icon {
      flex-shrink: 0;
      color: ${(props) => props.theme.sidebar.muted};
      transition: transform 0.2s ease;
    }
  }

  /* Center section - Bruno branding */
  .titlebar-center {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 6px;
    pointer-events: none;

    .bruno-text {
      font-size: 13px;
      font-weight: 600;
      color: ${(props) => props.theme.sidebar.muted};
      letter-spacing: 0.5px;
    }
  }

  /* Right section */
  .titlebar-right {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    flex-shrink: 0;
  }

  /* Action buttons in right section */
  .titlebar-action-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border: none;
    background: transparent;
    border-radius: 6px;
    cursor: pointer;
    color: ${(props) => props.theme.sidebar.color};
    transition: background 0.15s ease;

    &:hover {
      background: ${(props) => props.theme.sidebar.collection.item.hoverBg};
    }

    svg {
      color: ${(props) => props.theme.sidebar.color};
    }
  }

  /* Draggable region */
  .drag-region {
    flex: 1;
    height: 100%;
    -webkit-app-region: drag;
  }

  /* Workspace Dropdown Styles */
  .workspace-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 4px 10px !important;
    margin: 0 !important;

    &.active {
      .check-icon {
        opacity: 1;
      }
    }

    &:hover {
      .pin-btn:not(.pinned) {
        opacity: 1;
      }
    }

    .workspace-name {
      flex: 1;
      min-width: 0;
      font-size: 13px;
      font-weight: 400;
      color: ${(props) => props.theme.dropdown.color};
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .workspace-actions {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-left: 8px;
      flex-shrink: 0;
      pointer-events: none;

      > * {
        pointer-events: auto;
      }
    }

    .check-icon {
      color: ${(props) => props.theme.workspace?.accent || props.theme.colors?.text?.yellow};
      flex-shrink: 0;
    }

    .pin-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      padding: 0;
      border: none;
      background: transparent;
      border-radius: 4px;
      cursor: pointer;
      color: ${(props) => props.theme.dropdown.mutedText};
      transition: background 0.15s ease, color 0.15s ease, opacity 0.15s ease;
      opacity: 0;

      &.pinned {
        opacity: 1;
      }

      &:hover {
        background: ${(props) => props.theme.dropdown.hoverBg};
        color: ${(props) => props.theme.dropdown.mutedText};
      }
    }
  }

  /* Adjust for non-macOS platforms */
  body:not(.os-mac) & {
    .titlebar-content {
      padding-left: 12px;
    }
  }

  /* Leave room for Windows caption buttons when the overlay is enabled */
  body.os-windows & {
    .titlebar-content {
      padding-right: 120px;
    }
  }
`;

export default Wrapper;
