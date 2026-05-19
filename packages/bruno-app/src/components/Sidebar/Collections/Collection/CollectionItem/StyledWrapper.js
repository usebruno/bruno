import styled from 'styled-components';

const Wrapper = styled.div`
  position: relative;
  .menu-icon {
    color: ${(props) => props.theme.sidebar.dropdownIcon.color};
    visibility: hidden;

    .dropdown {
      div[aria-expanded='true'] {
        visibility: visible;
      }
      div[aria-expanded='false'] {
        visibility: visible;
      }
    }
  }

  .indent-block {
    border-right: 1px solid ${(props) => props.theme.sidebar.collection.item.indentBorder};
  }

  .collection-item-name {
    height: 1.6rem;
    cursor: pointer;
    user-select: none;
    position: relative;

    /* Default: menu icon hidden, shown on hover/focus states (see consolidated rule below) */
    .collection-item-menu-icon {
      visibility: hidden;
    }

    /* Common styles for drop indicators */
    &::before,
    &::after {
      content: '';
      position: absolute;
      left: 0;
      right: 0;
      height: 2px;
      background: ${(props) => props.theme.dragAndDrop.border};
      opacity: 0;
      pointer-events: none;
    }

    &::before {
      top: 0;
    }

    &::after {
      bottom: 0;
    }

    /* Drop target styles */
    &.drop-target {
      background-color: ${(props) => props.theme.dragAndDrop.hoverBg};

      &::before,
      &::after {
        opacity: 0;
      }
    }

    &.drop-target-above {
      &::before {
        opacity: 1;
        height: 2px;
      }
    }

    &.drop-target-below {
      &::after {
        opacity: 1;
        height: 2px;
      }
    }

    /* Inside drop target style */
    &.drop-target {
      &::before {
        top: 0;
        bottom: 0;
        height: 100%;
        opacity: 1;
        background: ${(props) => props.theme.dragAndDrop.hoverBg};
        border: ${(props) => props.theme.dragAndDrop.borderStyle} ${(props) => props.theme.dragAndDrop.border};
        // border-radius: 4px;
      }
    }

    .rotate-90 {
      transform: rotateZ(90deg);
    }

    span.item-name {
      white-space: nowrap;
      text-overflow: ellipsis;
      overflow: hidden;
    }

    .inline-rename-wrapper {
      display: flex;
      align-items: center;
      flex: 1;
      min-width: 0;
      margin-left: -2px;
      margin-right: 8px;
      border: 1px solid ${(props) => props.theme.input.border};
      border-radius: 3px;
      background: ${(props) => props.theme.input.bg};

      &:focus-within {
        border-color: ${(props) => props.theme.input.focusBorder};
      }
    }

    .inline-rename-input {
      font-size: 13px;
      padding: 1px 4px;
      border: none;
      background: transparent;
      color: ${(props) => props.theme.text};
      outline: none;
      flex: 1;
      min-width: 0;
    }

    .inline-rename-cog {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      width: 20px;
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

    /* Single source of truth for hover/focus states: background and menu icon visibility */
    &:hover,
    &.item-hovered,
    &.item-keyboard-focused {
      background: ${(props) => props.theme.sidebar.collection.item.hoverBg};
      .menu-icon,
      .collection-item-menu-icon {
        visibility: visible;
        background-color: transparent !important;
      }
    }

    &.item-target {
      background: #ccc3;
    }

    &.item-seperator {
      .seperator {
        bottom: 0px;
        position: absolute;
        height: 3px;
        width: 100%;
        background: #ccc3;
      }
    }

    &.item-focused-in-tab {
      background: ${(props) => props.theme.sidebar.collection.item.bg};

      &:hover {
        background: ${(props) => props.theme.sidebar.collection.item.bg} !important;
      }

      .indent-block {
        border-right: 1px solid ${(props) => props.theme.sidebar.collection.item.indentBorder} !important;
      }
    }

    &.item-keyboard-focused {
      border-top: 1px solid ${(props) => props.theme.sidebar.collection.item.focusBorder};
      border-bottom: 1px solid ${(props) => props.theme.sidebar.collection.item.focusBorder};
      outline: none;
    }

    div.tippy-box {
      position: relative;
      top: -0.625rem;
    }

    div.dropdown-item.delete-item {
      color: ${(props) => props.theme.colors.text.danger};
      &:hover {
        background-color: ${(props) => props.theme.colors.bg.danger} !important;
        color: white;
      }
    }
  }

  .empty-folder-message {
    display: flex;
    align-items: center;
    height: 1.6rem;
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.sidebar.muted};

    .add-request-link {
      color: ${(props) => props.theme.textLink};
      cursor: pointer;
    }
  }

  &.is-sidebar-dragging .collection-item-name {
    cursor: inherit;
  }
`;

export default Wrapper;
