import styled from 'styled-components';

const StyledWrapper = styled.div`
  .collection-name {
    height: 1.75rem;
    cursor: pointer;
    user-select: none;
    padding-left: 8px;
    border: ${(props) => props.theme.dragAndDrop.borderStyle} transparent;
    border-radius: 4px;
    transition: all 0.2s ease;
    margin: 0 4px;

    .rotate-90 {
      transform: rotateZ(90deg);
    }

    &.item-hovered {
      border-top: ${(props) => props.theme.dragAndDrop.borderStyle} ${(props) => props.theme.dragAndDrop.border};
      border-bottom: 2px solid transparent;
      .collection-actions {
        .dropdown, .settings-icon, .new-request-icon, .menu-icon-trigger {
          div[aria-expanded='false'] {
            visibility: visible;
          }
        }
        .settings-icon, .new-request-icon, .menu-icon-trigger {
          display: flex;
        }
      }
    }

    .collection-actions {
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

      svg {
        height: 22px;
        color: ${(props) => props.theme.sidebar.dropdownIcon.color};
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
  }

  #sidebar-collection-name {
    white-space: nowrap;
    text-overflow: ellipsis;
    overflow: hidden;
  }

  .transition-container {
    display: grid;
    grid-template-rows: 1fr;
    transition: grid-template-rows 0.2s ease-out;

    &.collapsed {
      grid-template-rows: 0fr;
    }

    .transition-inner {
      overflow: hidden;
    }
  }
`;

export default StyledWrapper;
