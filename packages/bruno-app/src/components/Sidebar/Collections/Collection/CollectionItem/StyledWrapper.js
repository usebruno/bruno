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
        background-color: ${(props) => props.theme.colors.bg.danger};
        color: white;
      }
    }
  }

  &.is-sidebar-dragging .collection-item-name {
    cursor: inherit;
  }

  .collection-item-name.drop-target {
    border: ${(props) => props.theme.dragAndDrop.borderStyle} ${(props) => props.theme.dragAndDrop.border};
    border-radius: 6px;
    background-color: ${(props) => props.theme.dragAndDrop.hoverBg};
    transition: ${(props) => props.theme.dragAndDrop.transition};
    box-shadow: 0 0 0 2px ${(props) => props.theme.dragAndDrop.hoverBg};
  }

  .collection-item-name.drop-target-above {
    border: none;
    border-top: ${(props) => props.theme.dragAndDrop.borderStyle} ${(props) => props.theme.dragAndDrop.border};
    margin-top: -2px;
    background: transparent;
    transition: ${(props) => props.theme.dragAndDrop.transition};
  }

  .collection-item-name.drop-target-below {
    border: none;
    border-bottom: ${(props) => props.theme.dragAndDrop.borderStyle} ${(props) => props.theme.dragAndDrop.border};
    margin-bottom: -2px;
    background: transparent;
    transition: ${(props) => props.theme.dragAndDrop.transition};
  }
`;

export default Wrapper;
