import styled from 'styled-components';

const Wrapper = styled.div`
  .collection-name {
    height: 1.6rem;
    cursor: pointer;
    user-select: none;
    padding-left: 4px;
    border: ${(props) => props.theme.dragAndDrop.borderStyle} transparent;

    .rotate-90 {
      transform: rotateZ(90deg);
    }
    .collection-actions {
      visibility: hidden;
    }

    /* Single source of truth for hover/focus states: background and menu icon visibility */
    &:hover,
    &:focus-within,
    &.collection-keyboard-focused {
      background: ${(props) => props.theme.sidebar.collection.item.hoverBg};
      .collection-actions {
        visibility: visible;
        background-color: transparent !important;
        .collection-menu-icon {
          visibility: visible;
        }
      }
    }

    &.item-hovered {
      border-top: ${(props) => props.theme.dragAndDrop.borderStyle} ${(props) => props.theme.dragAndDrop.border};
      border-bottom: 2px solid transparent;
      .collection-actions {
        visibility: visible;
        .dropdown, .settings-icon, .new-request-icon, .menu-icon-trigger {
          div[aria-expanded='false'] {
            visibility: visible;
          }
        }
        .settings-icon, .new-request-icon, .menu-icon-trigger {
          display: flex;
        }
        .collection-menu-icon {
          visibility: visible;
        }
      }
    }

    .collection-actions {
      color: ${(props) => props.theme.sidebar.dropdownIcon.color};

      .dropdown, .settings-icon, .new-request-icon, .menu-icon-trigger {
        div[aria-expanded='true'] {
          visibility: visible;
        }
        div[aria-expanded='false'] {
          visibility: hidden;
        }
      }

      .settings-icon, .new-request-icon, .menu-icon-trigger {
        display: none;
        width: 24px;
        height: 24px;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        &:hover {
          color: ${(props) => props.theme.sidebar.dropdownIcon.hoverColor || 'inherit'};
          background-color: ${(props) => props.theme.sidebar.dropdownIcon.hoverBg};
        }
      }

      .collection-menu-icon {
        visibility: hidden;
      }
    }

    .chevron-icon {
      color: ${(props) => props.theme.sidebar.dropdownIcon.color};
      border-radius: 4px;
      &:hover {
          color: ${(props) => props.theme.sidebar.dropdownIcon.hoverColor || 'inherit'};
          background-color: ${(props) => props.theme.sidebar.dropdownIcon.hoverBg};
      }
    }

    &:hover {
      background: ${(props) => props.theme.sidebar.collection.item.hoverBg};
      .collection-actions {
        .dropdown, .settings-icon, .new-request-icon, .menu-icon-trigger {
          div[aria-expanded='false'] {
            visibility: visible;
          }
        }
        .settings-icon, .new-request-icon, .menu-icon-trigger {
          display: flex;
        }
        .collection-menu-icon {
          visibility: visible;
        }
      }
    }

    div.tippy-box {
      position: relative;
      top: -0.625rem;
      font-weight: 400;
    }

    div.dropdown-item.delete-collection {
      color: ${(props) => props.theme.colors.text.danger};
      &:hover {
        background-color: ${(props) => props.theme.colors.bg.danger};
        color: white;
      }
    }

    &.drop-target {
      border: ${(props) => props.theme.dragAndDrop.borderStyle} ${(props) => props.theme.dragAndDrop.border};
      background-color: ${(props) => props.theme.dragAndDrop.hoverBg};
      transition: ${(props) => props.theme.dragAndDrop.transition};
    }

    &.drop-target-above {
      border: none;
      border-top: ${(props) => props.theme.dragAndDrop.borderStyle} ${(props) => props.theme.dragAndDrop.border};
      margin-top: -2px;
      background: transparent;
      transition: ${(props) => props.theme.dragAndDrop.transition};
    }

    &.drop-target-below {
      border: none;
      border-bottom: ${(props) => props.theme.dragAndDrop.borderStyle} ${(props) => props.theme.dragAndDrop.border};
      margin-bottom: -2px;
      background: transparent;
      transition: ${(props) => props.theme.dragAndDrop.transition};
    }

    &.collection-focused-in-tab {
      background: ${(props) => props.theme.sidebar.collection.item.bg};

      &:hover {
        background: ${(props) => props.theme.sidebar.collection.item.bg} !important;
      }
    }

    &.collection-keyboard-focused {
      border-top: 1px solid ${(props) => props.theme.sidebar.collection.item.focusBorder};
      border-bottom: 1px solid ${(props) => props.theme.sidebar.collection.item.focusBorder};
      outline: none;

       &:hover {
        background: ${(props) => props.theme.sidebar.collection.item.keyboardFocusBg} !important;
      }
    }
  }

  #sidebar-collection-name {
    white-space: nowrap;
    text-overflow: ellipsis;
    overflow: hidden;
  }
`;

export default Wrapper;
