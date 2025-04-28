import styled from 'styled-components';

const Wrapper = styled.div`
  .menu-icon {
    color: ${(props) => props.theme.sidebar.dropdownIcon.color};

    .dropdown {
      div[aria-expanded='true'] {
        visibility: visible;
      }
      div[aria-expanded='false'] {
        visibility: hidden;
      }
    }
  }

  .indent-block {
    border-right: ${(props) => props.theme.sidebar.collection.item.indentBorder};
  }

  .collection-item-name {
    height: 1.875rem;
    cursor: pointer;
    user-select: none;
    position: relative;

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

    &:hover,
    &.item-hovered {
      background: ${(props) => props.theme.sidebar.collection.item.hoverBg};
      .menu-icon {
        .dropdown {
          div[aria-expanded='false'] {
            visibility: visible;
          }
        }
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
        border-right: ${(props) => props.theme.sidebar.collection.item.active.indentBorder} !important;
      }
    }

    div.tippy-box {
      position: relative;
      top: -0.625rem;
    }

    div.dropdown-item.delete-item {
      color: ${(props) => props.theme.colors.danger};
      &:hover {
        background-color: ${(props) => props.theme.colors.bg.danger} !important;
        color: white;
      }
    }
  }

  &.is-sidebar-dragging .collection-item-name {
    cursor: inherit;
  }
`;

export default Wrapper;
